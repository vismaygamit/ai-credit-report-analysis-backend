import { io } from "../config/socket.js";
import fs from "fs";
import OpenAI from "openai";
import { config } from "dotenv";
import { getCreditReportForBot } from "../controllers/analyzeController.js";
config();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handleUserMessage(userId, query, preferLanguage) {
  try {
    const messages = [
      {
        role: "assistant",
        content:
          "You are a financial assistant that help to improve Canadian credit report. you are assistant at scorewise. do not give answer of general questions. give answer in short. whenever asking questions related to personal credit details, fetch it from getPersonalCreditInsights. if user ask questions related to frequently ask questions, fetch it from faqAnswer",
      },
      {
        role: "user",
        content: query + "responde with translation in " + preferLanguage + "(ISO language).",
      },
    ];

    const tools = [
      {
        type: "function",
        function: {
          name: "faqAnswer",
          description: "Finds the most relevant FAQ and returns an answer",
          parameters: {
            type: "object",
            properties: {
              userQuestion: {
                type: "string",
                description: "The user's question",
              },
            },
            required: ["userQuestion"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "getPersonalCreditInsights",
          description:
            "Finds the most relevant credit insight questions and returns structured answers across multiple dimensions. Capabilities include: \
1. Summarize core credit profile: score, tradelines, payment history, inquiries, collections, judgments, credit utilization, and credit age. \
2. Extract detailed account data: balances, limits, open/closed dates, payment timestamps, past dues, account types (revolving, installment, open, mortgage), inquiry details (dates, lenders, types), collection records (dates, agencies, statuses), and public records (bankruptcies, liens, judgments). \
3. Evaluate overall credit health: utilization vs. optimal levels, credit mix, payment history strength, delinquency aging/severity, inquiry frequency/timing, derogatory marks presence/age. \
4. Provide a 'Score Forecast Engine': estimate projected score increases based on actions (e.g., paying down specific cards, requesting credit limit increases, removing collections, reporting rent/utilities, avoiding hard inquiries), with timeline, priority, and confidence levels. \
5. Generate an 'AI Action Plan': actionable recommendations tailored to the report (e.g., pay down specific cards, add rent tradeline, request limit increase, avoid new applications, keep old accounts open), with tasks, priorities, and timelines. \
6. Offer a 'Dispute & Removal Toolkit': personalized dispute letters and goodwill request scripts with user details (name, address, account numbers, secured loan maturity information). \
7. Deliver a 'Score Progress Tracker': full credit summary, score simulation, action checklist, forecast chart, and dispute/goodwill templates. \
8. Run an 'AI Reminder & Re-Evaluation Engine': schedule reminders for expected updates, suggest score re-check intervals, and provide re-analysis timelines.",
        },
      },
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools,
      tool_choice: "auto",
    });

    // Did the model request to call a tool?
    const responseMessage = completion.choices[0].message;

    // Helper: emit + return
    const emitAndReturn = (content) => {
      io.to(userId).emit("message", content);
      return content;
    };

    // Helper: send followup to model
    const sendFollowup = async (toolCall, toolContent) => {
      const followup = await client.chat.completions.create({
        model: "o4-mini",
        messages: [
          ...messages,
          responseMessage,
          { role: "tool", tool_call_id: toolCall.id, content: toolContent },
        ],
      });
      return emitAndReturn(followup.choices[0].message.content);
    };

    // Tool calls
    if (responseMessage.tool_calls) {
      for (const toolCall of responseMessage.tool_calls) {
        switch (toolCall.function.name) {
          case "faqAnswer": {
            const args = JSON.parse(toolCall.function.arguments);
            const faqs = JSON.parse(
              fs.readFileSync("faqs_with_embeddings.json", "utf8")
            );
            const answer = await findBestFaq(args.userQuestion, faqs);
            return await sendFollowup(toolCall, JSON.stringify({ answer }));
          }

          case "getPersonalCreditInsights": {
            const { ispro, result } = await getPersonalCreditInsights(
              userId,
              preferLanguage
            );
            if (ispro) {
              return await sendFollowup(toolCall, JSON.stringify(result || {}));
            }
            return await sendFollowup(
              toolCall,
              "Purchase required for personal insights., Unlock personalized insights for $25."
            );
          }
        }
      }
    }

    // Default direct response
    return emitAndReturn(responseMessage.content);
  } catch (err) {
    console.error("OpenAI error:", err.message);
    // return "Sorry, I’m having trouble right now 😔.";
  }
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (normA * normB);
}

// --- robust findBestFaq ---
async function findBestFaq(userQuestion, faqs) {
  const list = assertArrayOfFaqs(faqs);

  const embeddingResponse = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: userQuestion,
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;

  let best = null;
  let bestSim = -Infinity;

  for (const item of list) {
    if (!item?.embedding || !Array.isArray(item.embedding)) continue; // skip un-embedded
    const sim = cosineSimilarity(queryEmbedding, item.embedding);
    if (sim > bestSim) {
      bestSim = sim;
      best = item;
    }
  }

  if (!best) {
    throw new Error(
      "No FAQs have embeddings. Run embedFaqs() first or add embeddings."
    );
  }

  return best; // { question, answer, embedding }
}

// --- helpers ---
function normalizeFaqs(raw) {
  // Accepts: Array, { faqs: [...] }, or stringified JSON of either
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      return normalizeFaqs(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw.faqs)) return raw.faqs;
  return [];
}

function assertArrayOfFaqs(faqs) {
  const list = normalizeFaqs(faqs);
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(
      "FAQ list is empty or not an array. Check your JSON shape."
    );
  }
  return list;
}

async function getPersonalCreditInsights(userId, preferLanguage) {
  return await getCreditReportForBot(userId, preferLanguage);
}
