import fs from "fs";
import OpenAI from "openai";
import { config } from "dotenv";
config();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embedFaqs() {
  if (fs.existsSync("faqs_with_embeddings.json")) {
    console.log(
      "⚠️ faqs_with_embeddings.json already exists. Skipping embedding."
    );
    return;
  }
  const faqs = JSON.parse(fs.readFileSync("faq.json", "utf8"));

  for (const faq of faqs) {
    const embeddingResponse = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: faq.question,
    });
    faq.embedding = embeddingResponse.data[0].embedding;
  }

  fs.writeFileSync("faqs_with_embeddings.json", JSON.stringify(faqs, null, 2));
  console.log("✅ FAQs embedded and saved.");
}
