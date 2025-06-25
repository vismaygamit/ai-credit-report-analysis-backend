import { config } from "dotenv";
import fs from "fs";
import OpenAI from "openai";
import CreditReport from "../models/report.js";
import Payment from "../models/payment.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
config();

export const analyze = async (req, res) => {
  try {
    const languageHeader = req.headers["accept-language"];
    let fullLanguage = "english";

    const lang = languageHeader.toLowerCase();
    if (languageHeader) {
      if (lang.startsWith("ru")) {
        fullLanguage = "russian";
      } else if (lang.startsWith("uk")) {
        fullLanguage = "ukrainian";
      } else if (lang.startsWith("es")) {
        fullLanguage = "spanish";
      } else if (lang.startsWith("fr")) {
        fullLanguage = "french";
      } else if (lang.startsWith("ar")) {
        fullLanguage = "arabic";
      } else if (lang.startsWith("hi")) {
        fullLanguage = "hindi";
      }
    }

    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: "Please select a file." });
    }

    const { userId, reportId } = req.body;

    let isPro;
    if (userId && reportId) {
      const payment = await Payment.findOne({ reportId, status: "paid" });

      isPro = !!payment;
    } else {
      isPro = false;
    }

    const filePath = req.file.path;
    const file = await client.files.create({
      file: fs.createReadStream(filePath),
      purpose: "user_data",
    });

    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const tools = [
      {
        type: "function",
        function: {
          name: "summarize_credit_report",
          description:
            "Generates a plain-language summary of a user's credit report with score, factor analysis, and action plan.",
          parameters: {
            type: "object",
            properties: {
              creditScore: {
                type: "array",
                items: { type: "string" },
                nullable: true,
                description:
                  "Brief explanation of the user's credit score category (e.g., Fair, Good) and numeric value. Return an empty array or null if not available.",
              },
              factorAnalysis: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    factor: { type: "string" },
                    status: { type: "string" },
                    details: { type: "string" },
                  },
                  required: ["factor", "status", "details"],
                },
                nullable: true,
                description:
                  "Analysis of key credit score factors like payment history, utilization, etc.",
              },
              actionPlan: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    month: { type: "string" },
                    actions: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                  required: ["month", "actions"],
                },
                nullable: true,
                description:
                  "Step-by-step plan to improve the score over the next 3 months.",
              },
              delinquencyStatus: {
                type: "string",
                nullable: true,
                description:
                  "Summary of delinquency or public record items and their expiry, or a clean record note.",
              },
              isEmpty: {
                type: "boolean",
                description:
                  "True if no meaningful credit report data is available (i.e., all sections are empty or null).",
              },
            },
            required: [
              "creditScore",
              "factorAnalysis",
              "actionPlan",
              "delinquencyStatus",
              "isEmpty",
            ],
          },
        },
      },
    ];

    const response = await client.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content:
            "You are a financial assistant that summarizes Canadian credit reports (e.g., Equifax Canada) from uploaded PDF files. Extract the credit score(should be numeric), factor breakdowns (payment history, utilization, account age, new credit, credit mix), and identify delinquencies, public records, and inquiries. Provide a plain-language summary, a 3-month action plan, and a 'isEmpty' flag if no data is available. Account for Canadian reporting rules, like 6-year expiry for delinquencies, and R/I/O codes. Only return clean structured data — not raw text or narrative summaries.",
        },
        {
          role: "user",
          content: [
            {
              type: "file",
              file: {
                file_id: file.id,
              },
            },
            {
              type: "text",
              text: `I’ve uploaded my Canadian credit report in PDF format. Please extract and analyze the following:\n\n• My credit score\n• All account types: revolving, installment, mortgage, and open\n• Details of each account: opening dates, current balances, and credit limits\n• Monthly payment history for the last 24 months\n• Status codes like R1, R2, I2, etc.\n• Credit inquiries: hard and soft, with dates\n• Any public records: bankruptcies, collections, judgments\n• Any missed or delinquent payments\n• Details of installment loans\n• Any employment or personal information, if available\n\nUse text extraction or OCR to capture this data from the uploaded PDF. Then generate a plain-language summary, identify concerns, and provide a 3-month action plan to improve my credit health. in ${fullLanguage}`,
            },
          ],
        },
      ],
      tools,
    });

    const toolCall = response.choices[0].message.tool_calls?.[0];

    if (toolCall) {
      // Parse the tool call arguments from the OpenAI response
      const args = JSON.parse(toolCall.function.arguments);

      if (args.isEmpty) {
        console.log("⚠️ Credit report is empty or invalid file.");
        return res.status(404).json({
          message: "Credit report is empty or the uploaded file is invalid.",
        });
      }
      if (userId) {
        const updateFields = {
          userId: userId,
          creditScore: args.creditScore || [],
          factorAnalysis: args.factorAnalysis || [],
          actionPlan: args.actionPlan || [],
          delinquencyStatus: args.delinquencyStatus || "",
          reportLanguage: lang,
        };

        // Remove undefined fields to avoid overwriting with undefined
        Object.keys(updateFields).forEach(
          (key) =>
            (updateFields[key] === undefined || updateFields[key] === null) &&
            delete updateFields[key]
        );

        const report = new CreditReport(updateFields);
        await report.save();

        return res.status(200).json({
          count: Object.keys(report).length,
          ispro: isPro,
          result: report ? report : {},
        });
      } else {
        return res.status(200).json({
          count: Object.keys(args).length,
          ispro: isPro,
          result: args,
        });
      }
    } else {
      console.log("⚠️ No tool call returned.");
      return res.status(404).json({
         message: "Credit report is empty or the uploaded file is invalid."
        });
    }
  } catch (error) {
    console.error("Error in analyze:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getCreditReport = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User id is required." });
    }
    const report = await CreditReport.findOne({ userId: userId }).sort({
      createdAt: -1,
    });
    
    let isPro;
    if (report?._id) {
      const payment = await Payment.findOne({
        reportId: report._id,
        status: "paid",
      });
      isPro = !!payment;
    } else {
      isPro = false;
    }

    return res.status(200).json({
      count: report
        ? Object.keys(report.toObject ? report.toObject() : report).length
        : 0,
      ispro: isPro,
      result: report || {},
    });
  } catch (error) {
    console.error("Error fetching credit report:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
