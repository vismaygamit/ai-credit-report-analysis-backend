import { config } from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import CreditReport from "../models/report.js";
import Payment from "../models/payment.js";
import pdfjs from "pdfjs-dist/legacy/build/pdf.js";
const { getDocument, GlobalWorkerOptions } = pdfjs;
import { clerkClient } from "@clerk/express";
import { sendMail } from "../util/sendMail.js";
config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
GlobalWorkerOptions.workerSrc = path.resolve(
  __dirname,
  "../../node_modules/pdfjs-dist/legacy/build/pdf.worker.js"
);

const extractTextFromPDF = async (pdfPath) => {
  const rawData = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await getDocument({ data: rawData }).promise;

  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const pageText = content.items.map((item) => item.str).join(" "); // combine strings (or '\n' for new lines)

    fullText += `\n\nPage ${pageNum}:\n${pageText}`;
  }

  return fullText;
};

export const analyze = async (req, res) => {
  try {
    const { userId } = req.auth;
    if (!userId) {
      return res.status(400).json({ message: "Invalid request" });
    }
    const lang = req.get("Accept-Language");
    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: "Please select a file." });
    }

    const { reportId } = req.body;

    let isPro;
    if (userId && reportId) {
      const payment = await Payment.findOne({ reportId, status: "paid" });

      isPro = !!payment;
    } else {
      isPro = false;
    }

    const filePath = req.file.path;
    const fullText = await extractTextFromPDF(filePath);

    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const tools = [
      {
        type: "function",
        function: {
          name: "summarize_credit_report",
          description:
            "Summarizes and analyzes a personal credit report, including score evaluation, forecast, simulation, disputes, progress tracking, and reminders.",
          parameters: {
            type: "object",
            properties: {
              emptyResponse: {
                type: "boolean",
                description:
                  "Set to true if the input credit report has no data or is empty.",
              },
              summary: {
                type: "object",
                properties: {
                  score: { type: "number" },
                  rating: { type: "string" },
                  tradelines: {
                    type: "object",
                    description: "it should be sentence in short",
                    properties: {
                      revolving: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                      },
                      installment: { type: "array", items: { type: "string" } },
                      open: { type: "array", items: { type: "string" } },
                      mortgage: { type: "array", items: { type: "string" } },
                    },
                  },
                  paymentHistory: {
                    type: "object",
                    properties: {
                      allCurrent: { type: "boolean" },
                      missedOrLatePast24Months: { type: "number" },
                    },
                  },
                  inquiries: {
                    type: "object",
                    properties: {
                      total: {
                        type: "integer",
                        description: "Total number of inquiries",
                      },
                      hard: {
                        type: "array",
                        description:
                          "List of hard inquiries, Use the affectsScore field to distinguish: Yes = hard, No = soft",
                        items: {
                          type: "object",
                          properties: {
                            date: { type: "string", format: "date" },
                            lender: { type: "string" },
                            type: { type: "string", enum: ["hard"] },
                            affectsScore: { type: "boolean", const: true },
                          },
                          required: ["date", "lender", "type", "affectsScore"],
                        },
                      },
                      soft: {
                        type: "array",
                        description:
                          "List of soft inquiries, Use the affectsScore field to distinguish: Yes = hard, No = soft",
                        items: {
                          type: "object",
                          properties: {
                            date: { type: "string", format: "date" },
                            lender: { type: "string" },
                            type: { type: "string", enum: ["soft"] },
                            affectsScore: { type: "boolean", const: false },
                          },
                          required: ["date", "lender", "type", "affectsScore"],
                        },
                      },
                    },
                    required: ["total", "hard", "soft"],
                  },
                  collections: { type: "number" },
                  judgments: { type: "number" },
                  creditUtilization: {
                    type: "object",
                    properties: {
                      totalLimit: { type: "number" },
                      totalBalance: { type: "number" },
                      utilizationRate: { type: "number" },
                      rating: { type: "string" },
                    },
                  },
                  creditAge: {
                    type: "object",
                    properties: {
                      oldest: {
                        type: "object",
                        properties: {
                          account: { type: "string" },
                          opened: { type: "string" },
                        },
                      },
                      newest: {
                        type: "object",
                        properties: {
                          account: { type: "string" },
                          opened: { type: "string" },
                        },
                      },
                      averageAgeYears: { type: "number" },
                    },
                  },
                },
              },
              accountsAndBalances: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    lender: { type: "string" },
                    openDate: { type: "string" },
                    limit: { type: ["number", "null"] },
                    balance: { type: "number" },
                    status: { type: "string" },
                    closed: { type: "boolean" },
                    pastDue: { type: "number" },
                  },
                },
              },
              publicRecords: {
                type: "object",
                properties: {
                  collections: { type: "number" },
                  judgments: { type: "number" },
                },
              },
              securedLoan: {
                type: "object",
                properties: {
                  lender: { type: "string" },
                  registered: { type: "string" },
                  amount: { type: "number" },
                  maturity: { type: "string" },
                },
              },
              creditEvaluation: {
                type: "object",
                properties: {
                  utilization: { type: "string" },
                  creditMix: { type: "string" },
                  paymentHistory: { type: "string" },
                  delinquency: { type: "string" },
                  inquiryFrequency: { type: "string" },
                  derogatoryMarks: { type: "string" },
                  fileDepth: { type: "string" },
                },
              },
              scoreForecast: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    action: { type: "string" },
                    estimatedImpact: { type: "string" },
                    timeline: { type: "string" },
                    priority: { type: "string" },
                    confidence: { type: "string" },
                  },
                },
              },
              actionPlan: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    recommendation: { type: "string" },
                    description: { type: "string" },
                    priority: { type: "string" },
                    timeline: { type: "string" },
                  },
                },
              },
              disputeToolkit: {
                type: "object",
                // description: "generate letter only for problematic accounts such as missed payment, unable to collect",
                properties: {
                  disputeLetter: {
                    type: "string",
                    description:
                      "Generate a dispute letter only for the most problematic account. The output must be in formal letter format.",
                  },
                  goodwillScript: {
                    type: "string",
                    description:
                      "Generate a goodwill letter only for the most problematic account of one or more past due delinquencies (late payments) from the credit report." +
                      "This letter should be triggered if the account has documented delinquencies (e.g., 30, 60, 90 days late), or if the account is marked as written-off (I9 status), " +
                      "even if it is not currently in good standing. For I9 accounts, the letter should acknowledge past financial hardship and request leniency as a gesture of goodwill. " +
                      "Include the account type, account ending digits, dates of delinquencies, and a brief explanation of improved financial behavior. " +
                      "Do not trigger this for accounts with no delinquencies. This tool is intended to support creditor goodwill requests across all credit types, including installment, revolving, and mortgage accounts.",
                  },
                },
              },
              scoreProgress: {
                type: "object",
                properties: {
                  creditSummary: {
                    type: "object",
                    properties: {
                      onTimePayments: { type: "string" },
                      activeAccounts: { type: "number" },
                      derogatoryMarks: { type: "number" },
                    },
                  },
                  scoreSimulator: {
                    type: "array",
                    description:
                      "Simulated scenarios for potential credit score changes.",
                    items: {
                      type: "object",
                      properties: {
                        scenario: { type: "string" },
                        description: { type: "string" },
                        projectedScoreChange: { type: "string" },
                        impactType: {
                          type: "string",
                          enum: ["positive", "negative", "neutral"],
                        },
                      },
                    },
                  },
                  target: { type: "string" },
                  checklist: {
                    type: "object",
                    properties: {
                      payCTB1: {
                        type: "object",
                        properties: {
                          desc: { type: "string" },
                          istrue: { type: "boolean" },
                        },
                      },
                      keepCIBCOpen: {
                        type: "object",
                        properties: {
                          desc: { type: "string" },
                          istrue: { type: "boolean" },
                        },
                      },
                      requestCLI: {
                        type: "object",
                        properties: {
                          desc: { type: "string" },
                          istrue: { type: "boolean" },
                        },
                      },
                      reportRent: {
                        type: "object",
                        properties: {
                          desc: { type: "string" },
                          istrue: { type: "boolean" },
                        },
                      },
                      avoidApplications: {
                        type: "object",
                        properties: {
                          desc: { type: "string" },
                          istrue: { type: "boolean" },
                        },
                      },
                    },
                  },

                  forecastChart: {
                    type: "object",
                    description:
                      "Chart showing historical and projected credit score changes over time.",
                    properties: {
                      dataPoints: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            date: { type: "string" },
                            datedesc: {
                              type: "string",
                              description: "write all possible date values",
                            },
                            score: { type: "number" },
                          },
                        },
                      },
                      targetScore: { type: "number" },
                      targetDate: { type: "string" },
                    },
                  },
                },
              },
              reminders: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    event: { type: "string" },
                    reminderDate: {
                      type: "string",
                      description: "must be date",
                    },
                    action: { type: "string" },
                  },
                },
              },
            },
            required: [
              "emptyResponse",
              "summary",
              "accountsAndBalances",
              "inquiries",
              "publicRecords",
              "securedLoan",
              "creditEvaluation",
              "scoreForecast",
              "actionPlan",
              "disputeToolkit",
              "scoreProgress",
              "reminders",
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
            "You are a financial assistant that summarizes Canadian credit report. 1. Extract the following information from the provided credit report and present it in a structured, fixed format: Score, tradelines, payment history, inquiries, collections, judgments, credit utilization, and credit age. 2. Extract structured data from the provided PDF, including: balance, limits, open/closed dates for all accounts; payment timestamps and past dues; account types (revolving, installment, open, mortgage); inquiry dates, lenders, and types; collection dates, agencies, and statuses; and public records such as bankruptcies, liens, and judgments. 3. Evaluate the credit report data based on the following criteria: total utilization vs. optimal levels, credit mix, payment history strength, delinquency aging & severity, inquiry frequency and timing, presence and age of derogatory marks, and whether it's a thin file vs. seasoned file. 4. Provide a 'Score Forecast Engine' that estimates projected score increases based on user actions like paying down specific cards, asking for credit limit increases, removing old collections, reporting rent/utilities, and avoiding hard inquiries. The output should show the score impact, timeline for effect, priority of actions, and confidence level of the forecast, all in a fixed format. 5. Generate an 'AI Action Plan Generator' providing personalized, actionable items based on the credit report data. The plan should include recommendations for: paying down specific cards, adding a rent tradeline, asking the bank for a credit limit increase, avoiding credit applications, and keeping old accounts open, presented in a fixed format with specific recommendations, priority, and timeline for each. 6. Generate a 'Dispute & Removal Toolkit' including templates for a dispute letter and a goodwill removal script. These templates should be personalized with my credit report information (name, address, relevant account numbers, and specific details for a potential secured loan maturity date dispute) and presented in a fixed format. 7. Provide a 'Score Progress Tracker' output that includes a full credit summary, score simulation, action checklist, forecast chart, and dispute & goodwill letters, presented in a fixed format." +
            "8. Create an 'AI Reminder & Re-Evaluation Engine' that suggests when credit updates are likely to appear, reminds the user to re-check their score, and proposes a timeline for re-analysis, all in a fixed format. Do **not** translate disputeLetter and goodwillScript.",
        },
        {
          role: "user",
          content: `Please analyze and respond Extract from the following section:\n\n${fullText}. output language should be ${lang} language.`,
          // content: [
          //   {
          //     type: "file",
          //     file: {
          //       file_id: file.id,
          //     },
          //   },
          //   {
          //     type: "text",
          //     text: `Please analyze and respond Extract from the following section:\n\n${fullText}.`,
          //   },
          // ],
        },
      ],
      tools,
    });
    const toolCall1 = response.choices[0].message.tool_calls?.[0];
    const args = JSON.parse(toolCall1.function.arguments);

    if (isToolCallEmpty(response) || args?.emptyResponse === true) {
      console.log("⚠️ Credit report is empty or invalid file.");
      return res.status(404).json({
        message: "Credit report is empty or the uploaded file is invalid.",
      });
    } else {
      // Parse the tool call arguments from the OpenAI response
      const updateFields = {
        userId,
        summary: args.summary ?? {},
        accountsAndBalances: Array.isArray(args.accountsAndBalances)
          ? args.accountsAndBalances
          : [],
        inquiries: Array.isArray(args.inquiries) ? args.inquiries : [],
        publicRecords: args.publicRecords ?? {},
        securedLoan: args.securedLoan ?? {},
        creditEvaluation: args.creditEvaluation ?? {},
        scoreForecast: Array.isArray(args.scoreForecast)
          ? args.scoreForecast
          : [],
        preferLanguage: lang,
        actionPlan: Array.isArray(args.actionPlan) ? args.actionPlan : [],
        disputeToolkit: args.disputeToolkit ?? {},
        scoreProgress: args.scoreProgress ?? {},
        reminders: Array.isArray(args.reminders) ? args.reminders : [],
      };

      // Remove fields that are undefined or null
      for (const key in updateFields) {
        if (updateFields[key] === undefined || updateFields[key] === null) {
          delete updateFields[key];
        }
      }

      // Save the report to the database
      const report = await CreditReport.create(updateFields);

      // Respond with the saved report

      return res.status(200).json({
        count: Object.keys(report || 0).length,
        ispro: isPro,
        result: Object.keys(report || {}).length > 0 ? report : {},
      });
    }
  } catch (error) {
    console.error("Error in analyze:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

function isToolCallEmpty(response) {
  try {
    const toolCalls = response?.choices?.[0]?.message?.tool_calls;

    if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
      console.warn("No tool call was returned.");
      return true;
    }

    const toolCall = toolCalls[0];
    const args = toolCall?.function?.arguments;

    if (!args || args.trim() === "{}") {
      console.warn("Tool call returned, but arguments are empty.");
      return true;
    }

    // Optionally, you can attempt to parse the arguments to confirm structure
    let parsedArgs;
    try {
      parsedArgs = JSON.parse(args);
    } catch (err) {
      console.error("Invalid JSON in tool call arguments:", err);
      return true;
    }

    // Add custom logic here to check if parsedArgs is meaningful
    if (Object.keys(parsedArgs).length === 0) {
      console.warn("Parsed arguments are empty.");
      return true;
    }

    return false; // Tool call is not empty
  } catch (error) {
    console.error("Error checking tool call:", error);
    return true; // Fail safe: consider it empty on unexpected error
  }
}

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
      const prompt = `Translate this JSON to ${
        report.preferLanguage
      }:\n\n${JSON.stringify(
        report,
        null,
        2
      )}\n\nOnly translate the **string values**. Do **not** change any keys or structure. 
Return only valid JSON with no explanation, no code block, no formatting. Do **not** translate disputeLetter and goodwillScript
.`;

      const completion = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      const translatedText = completion.choices[0].message.content;

      const cleaned = translatedText
        .replace(/^```(json)?/, "")
        .replace(/```$/, "")
        .trim();
      const translatedObject = JSON.parse(cleaned);

      const payment = await Payment.findOne({
        reportId: report._id,
        status: "paid",
      });
      isPro = !!payment;
      return res.status(200).json({
        count: translatedObject
          ? Object.keys(
              translatedObject.toObject
                ? translatedObject.toObject()
                : translatedObject
            ).length
          : 0,
        ispro: isPro,
        result: translatedObject || {},
      });
    } else {
      isPro = false;
      return res.status(200).json({
        count: report
          ? Object.keys(report.toObject ? report.toObject() : report).length
          : 0,
        ispro: isPro,
        result: report || {},
      });
    }
  } catch (error) {
    console.error("Error fetching credit report:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const transLate = async (req, res) => {
  const { userId } = req.auth;
  if (!userId) {
    return res.status(400).json({ message: "Invalid request" });
  }
  const { object, targetLanguage } = req.body;
  const report = await CreditReport.findById(object?._id).select("isEmailSent");
  const updatedUser = await CreditReport.findByIdAndUpdate(
    object?._id,
    { targetLanguage },
    { new: true, runValidators: true }
  );
  object.isEmailSent = report?.isEmailSent;

  const prompt = `Translate this JSON to ${targetLanguage}:\n\n${JSON.stringify(
    object,
    null,
    2
  )}\n\nOnly translate the **string values**. Do **not** change any keys or structure. 
Return only valid JSON with no explanation, no code block, no formatting. Do **not** translate disputeLetter and goodwillScript
.`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const translatedText = completion.choices[0].message.content;

    const cleaned = translatedText
      .replace(/^```(json)?/, "")
      .replace(/```$/, "")
      .trim();
    const translatedObject = JSON.parse(cleaned);
    return res.status(200).json({ translated: translatedObject });
  } catch (err) {
    console.error("Translation failed:", err);
    res.status(500).json({ message: "Translation failed" });
  }
};

export const sendReport = async (req, res) => {
  try {
    const { userId } = req.auth;
    const { reportId } = req.body;
    const user = await clerkClient.users.getUser(userId);

    const toEmail = user?.emailAddresses[0]?.emailAddress;
    if (!userId || !toEmail || !reportId) {
      return res.status(400).json({ message: "Invalid request" });
    }

    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: "Please select a file." });
    }
    const filePath = path.resolve(req.file.path);
    const mailOptions = {
      from: '"Credit Report" contact@scorewise.ca',
      to: toEmail,
      subject: "Your Credit Report",
      text: `Hello,

Attached is your latest credit report, generated by Scorewise.

We encourage you to review your report carefully and stay informed about your credit health.
At Scorewise, we’re committed to helping you understand, monitor, and improve your credit.

If you have any questions or need help interpreting your report, feel free to reach out.

Best regards,  
Scorewise`,
      attachments: [
        {
          filename: req.file.originalname || "Credit_Report.pdf",
          path: filePath,
          contentType: "application/pdf",
        },
      ],
    };

    const isSent = await sendMail(mailOptions);
    if (isSent) {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      await CreditReport.findOneAndUpdate(
        { _id: reportId },
        { isEmailSent: true },
        { new: true }
      );
      res.status(200).json({ message: "Email send successfully" });
    }
  } catch (error) {
    console.error("Failed to send email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
};

export const sendReceipt = async (req, res) => {
  try {
    const { userId } = req.auth;
    const user = await clerkClient.users.getUser(userId);

    const toEmail = user?.emailAddresses[0]?.emailAddress;
    if (!userId || !toEmail) {
      return res.status(400).json({ message: "Invalid request" });
    }

    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: "Please select a file." });
    }
    const filePath = path.resolve(req.file.path);
    const mailOptions = {
      from: '"Payment receipt of scorewise" contact@scorewise.ca',
      to: toEmail,
      subject: "Payment receipt of credit report",
      text: `Hello,

Thank you for your payment. Please find the attached receipt.

If you have any questions, feel free to contact us.

Best regards,
Scorewise
`,
      attachments: [
        {
          filename: req.file.originalname || "Payment_Receipt.pdf",
          path: filePath,
          contentType: "application/pdf",
        },
      ],
    };

    const isSent = await sendMail(mailOptions);
    if (isSent) {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      res.status(200).json({ message: "Email send successfully" });
    }
  } catch (error) {
    console.error("Failed to send email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
};

export const getUserLanguage = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User id is required." });
    }

    const result = await CreditReport.findOne({ userId: userId })
      .select("preferLanguage")
      .sort({ createdAt: -1 })
      .lean();

    return res
      .status(200)
      .json({ preferLanguage: result?.preferLanguage || "en" });
  } catch (error) {
    console.error("Error fetching user language:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateUserLanguage = async (req, res) => {
  try {
    const { userId } = req.auth;
    const { lang } = req.params;

    if (!userId || !lang) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const updatedReport = await CreditReport.findOneAndUpdate(
      { userId: userId },
      {
        preferLanguage: lang,
      },
      { new: true }
    ).sort({ createdAt: -1 });

    if (!updatedReport) {
      return res.status(404).json({ message: "Language not found" });
    }

    return res.status(200).json({ message: "Language updated", lang });
  } catch (error) {
    console.error("Error updating user language:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getCreditReportForBot = async (userId, preferLanguage) => {
  try {
    if (!userId) {
      throw new Error("User id is required.");
    }

    const report = await CreditReport.findOne({ userId }).sort({
      createdAt: -1,
    });

    let isPro = false;
    if (report?._id) {
      const prompt = `Translate this JSON to ${preferLanguage}:\n\n${JSON.stringify(
        report,
        null,
        2
      )}\n\nOnly translate the **string values**. 
Do **not** change any keys or structure. Return only valid JSON with no explanation, no code block, no formatting. 
Do **not** translate disputeLetter and goodwillScript.`;

      const completion = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      const translatedText = completion.choices[0].message.content;

      const cleaned = translatedText
        .replace(/^```(json)?/, "")
        .replace(/```$/, "")
        .trim();

      const translatedObject = JSON.parse(cleaned);

      const payment = await Payment.findOne({
        reportId: report._id,
        status: "paid",
      });

      isPro = !!payment;

      return {
        ispro: isPro,
        result: translatedObject || {},
      };
    } else {
      return {
        ispro: false,
        result: report || {},
      };
    }
  } catch (error) {
    console.error("Error fetching credit report:", error);
    throw new Error("Internal server error");
  }
};
