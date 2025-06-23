import { config } from "dotenv";
import fs from "fs";
import OpenAI from "openai";
import CreditReport from "../models/report.js";
import Payment from "../models/payment.js";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
config();

export const analyze = async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: "Please select a file." });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "UserId is required" });
    }

    const payment = await Payment.findOne({ userId, status: "paid" });

    const isPro = !!payment;

    const filePath = req.file.path;

    const file = await client.files.create({
      file: fs.createReadStream(filePath),
      purpose: "user_data",
    });
    const language = "en"; // Assuming language is set to English for this example
    const tools = [
      {
        type: "function",
        function: {
          name: "summarize_credit_report",
          description:
            "Generates a plain-language summary of a user's credit report.",
          parameters: {
            type: "object",
            properties: {
              creditScore: {
                type: "array",
                items: { type: "string" },
                nullable: true,
                description:
                  "Brief explanation of the user's credit score and what it means. Return an empty array or null if not available.",
              },
              mainConcerns: {
                type: "array",
                items: { type: "string" },
                nullable: true,
                description:
                  "Key factors negatively impacting the user's credit health. Return an empty array or null if not available.",
              },
              accountTypes: {
                type: "array",
                items: { type: "string" },
                nullable: true,
                description:
                  "Summaries of each type of credit account (e.g., 'Credit card: 2 open accounts, all current.'). Return an empty array or null if not available.",
              },
              isEmpty: {
                type: "boolean",
                description:
                  "True if no meaningful credit report data is available (i.e., all sections are empty or null).",
              },
            },
            required: [
              "creditScore",
              "mainConcerns",
              "accountTypes",
              "isEmpty",
            ],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "analyze_credit_report_detailed",
          description:
            "Performs a full professional credit analysis including scores, ratios, trends, red flags, and recommendations.",
          parameters: {
            type: "object",
            properties: {
              credit_scores: {
                type: "object",
                nullable: true,
                description:
                  "All available credit scores and percentile rankings. Return null if unavailable.",
                properties: {
                  vantage_score: { type: "number", nullable: true },
                  insight_score: { type: "number", nullable: true },
                  generic_risk_score: { type: "number", nullable: true },
                },
                required: ["vantage_score"],
              },
              income_employment: {
                type: "object",
                nullable: true,
                description:
                  "Summary of the user's employment and income profile. Return null if unavailable.",
                properties: {
                  employer: { type: "string", nullable: true },
                  income_annual: { type: "number", nullable: true },
                  income_trend: {
                    type: "string",
                    nullable: true,
                    description: "Increasing, stable, or decreasing.",
                  },
                  job_title: { type: "string", nullable: true },
                  years_employed: { type: "number", nullable: true },
                },
                required: ["income_annual", "years_employed"],
              },
              liabilities_summary: {
                type: "object",
                nullable: true,
                description:
                  "Debt balances across credit types. Return null if unavailable.",
                properties: {
                  revolving: {
                    type: "object",
                    nullable: true,
                    properties: {
                      balance: { type: "number", nullable: true },
                      credit_limit: { type: "number", nullable: true },
                      high_credit: { type: "number", nullable: true },
                      scheduled_payment: { type: "number", nullable: true },
                    },
                  },
                  installment: {
                    type: "object",
                    nullable: true,
                    properties: {
                      balance: { type: "number", nullable: true },
                      credit_limit: { type: "number", nullable: true },
                      high_credit: { type: "number", nullable: true },
                      scheduled_payment: { type: "number", nullable: true },
                    },
                  },
                  other: {
                    type: "object",
                    nullable: true,
                    properties: {
                      balance: { type: "number", nullable: true },
                      credit_limit: { type: "number", nullable: true },
                      high_credit: { type: "number", nullable: true },
                      scheduled_payment: { type: "number", nullable: true },
                    },
                  },
                  mortgage: {
                    type: "object",
                    nullable: true,
                    properties: {
                      balance: { type: "number", nullable: true },
                      credit_limit: { type: "number", nullable: true },
                      high_credit: { type: "number", nullable: true },
                      scheduled_payment: { type: "number", nullable: true },
                    },
                  },
                },
              },
              ratios: {
                type: "object",
                nullable: true,
                description:
                  "Financial ratios used in credit decisioning. Return null if unavailable.",
                properties: {
                  dti_ratio: {
                    type: "number",
                    nullable: true,
                    description: "Debt-to-Income ratio as a percentage.",
                  },
                  revolving_utilization_ratio: {
                    type: "number",
                    nullable: true,
                    description: "Revolving credit utilization percentage.",
                  },
                },
              },
              credit_history_summary: {
                type: "object",
                nullable: true,
                description:
                  "Summary of user's credit history. Return null if unavailable.",
                properties: {
                  total_accounts: { type: "number", nullable: true },
                  revolving_accounts: { type: "number", nullable: true },
                  installment_accounts: { type: "number", nullable: true },
                  mortgage_accounts: { type: "number", nullable: true },
                  other_accounts: { type: "number", nullable: true },
                  oldest_account_years: { type: "number", nullable: true },
                  avg_account_age_years: { type: "number", nullable: true },
                  delinquencies_30: { type: "number", nullable: true },
                  delinquencies_60: { type: "number", nullable: true },
                  delinquencies_90: { type: "number", nullable: true },
                  most_recent_account_date: {
                    type: "string",
                    format: "date",
                    nullable: true,
                  },
                },
              },
              inquiries_summary: {
                type: "object",
                nullable: true,
                description:
                  "Summary of recent credit inquiries. Return null if unavailable.",
                properties: {
                  recent_inquiries: { type: "number", nullable: true },
                  sources: {
                    type: "array",
                    nullable: true,
                    items: { type: "string" },
                  },
                },
              },
              red_flags: {
                type: "array",
                items: { type: "string" },
                nullable: true,
                description:
                  "Notable concerns in the credit profile. Return null or empty if none found.",
              },
              positive_indicators: {
                type: "array",
                items: { type: "string" },
                nullable: true,
                description:
                  "Healthy credit indicators. Return null or empty if none found.",
              },
              datx_derogatory_info: {
                type: "object",
                nullable: true,
                description:
                  "Detailed derogatory data. Return null if unavailable.",
                properties: {
                  returned_payments: { type: "number", nullable: true },
                  subprime_lenders: {
                    type: "array",
                    items: { type: "string" },
                    nullable: true,
                  },
                  notes: { type: "string", nullable: true },
                },
              },
              recommendations: {
                type: "object",
                nullable: true,
                description:
                  "Tailored recommendations for underwriters and borrower. Return null if unavailable.",
                properties: {
                  for_underwriters: {
                    type: "array",
                    items: { type: "string" },
                    nullable: true,
                  },
                  for_borrower: {
                    type: "array",
                    items: { type: "string" },
                    nullable: true,
                  },
                },
              },
              final_assessment: {
                type: "object",
                nullable: true,
                description:
                  "Overall credit assessment. Return null if unavailable.",
                properties: {
                  credit_risk: { type: "string", nullable: true },
                  liquidity: { type: "string", nullable: true },
                  stability: { type: "string", nullable: true },
                  recommendation: { type: "string", nullable: true },
                },
              },
              isEmpty: {
                type: "boolean",
                description:
                  "True if all sections of the credit report are empty or null, indicating no useful data is present.",
              },
            },
            required: [
              "credit_scores",
              "income_employment",
              "liabilities_summary",
              "ratios",
              "credit_history_summary",
              "inquiries_summary",
              "red_flags",
              "positive_indicators",
              "datx_derogatory_info",
              "recommendations",
              "final_assessment",
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
          content: isPro
            ? `You are a professional AI credit analyst for Canadians. Analyze the uploaded PDF thoroughly, extracting and interpreting all relevant credit and financial information, including income, liabilities, credit history, trends, ratios (e.g., DTI, LTV), and potential risk indicators. Provide detailed insights, red flags, and tailored recommendations to support credit decisions. Handle tables, charts, and complex financial formats accurately. Maintain a professional, clear, and insightful tone throughout the report.`
            : `You are a credit assistant for Canadians. Provide a general summary of the user's credit report using clear, simple language. Highlight the credit score, major issues, and types of accounts. Do not give detailed account-by-account breakdowns or personalized strategies. Keep responses short, helpful, and beginner-friendly. Avoid technical terms. Make sure to include a simple summary of account types even if brief.`,
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
              text: isPro
                ? `Analyze the attached credit report fully and provide detailed financial analysis and creditworthiness insights.`
                : `Please review the attached credit report and give me a quick summary including: - The credit score and how it ranks - Any major negative items - Basic breakdown of account types, Keep it simple and easy to understand.`,
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
        return res
          .status(400)
          .json({ message: "Credit report is empty or invalid file." });
      }

      const updateFields = {
        plan_type: isPro ? "pro" : "basic",
        credit_score: args.creditScore || [],
        main_concerns: args.mainConcerns || [],
        types_of_accounts: args.accountTypes || [],
        credit_scores: args.credit_scores || {},
        income_employment: args.income_employment || {},
        liabilities_summary: args.liabilities_summary || {},
        ratios: args.ratios || {},
        red_flags: args.red_flags || [],
        positive_indicators: args.positive_indicators || [],
        recommendations: args.recommendations || [],
        final_assessment: args.final_assessment || {},
        credit_history_summary: args.credit_history_summary || {},
        inquiries_summary: args.inquiries_summary || {},
        datx_derogatory_info: args.datx_derogatory_info || {},
      };

      // Remove undefined fields to avoid overwriting with undefined
      Object.keys(updateFields).forEach(
        (key) =>
          (updateFields[key] === undefined || updateFields[key] === null) &&
          delete updateFields[key]
      );

      const report = await CreditReport.findOneAndUpdate(
        { userId: req.body.userId },
        { $set: updateFields },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted local file: ${filePath}`);
      }
      return res.status(200).json({
        count: Object.keys(report).length,
        ispro: isPro,
        result: report ? report : {},
      });
    } else {
      console.log("⚠️ No tool call returned.");
      return res
        .status(400)
        .json({ error: "No summary generated from the credit report." });
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
      return res.status(400).json({ message: "User ID is required." });
    }
    const report = await CreditReport.findOne({ userId });

    // return;
    return res.status(200).json({
      count: report
        ? Object.keys(report.toObject ? report.toObject() : report).length
        : 0,
      ispro: report?.plan_type === "pro",
      result: report || {},
    });
  } catch (error) {
    console.error("Error fetching credit report:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
