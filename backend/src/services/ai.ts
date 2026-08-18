import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface ReviewForSummary {
  rating: number;
  comment: string;
}

export async function summarizeReviews(
  businessName: string,
  reviews: ReviewForSummary[],
): Promise<string> {
  const reviewText = reviews.map((r) => `${r.rating}星: ${r.comment}`).join("\n");

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `以下是商家"${businessName}"的顾客评论。请用中文简洁总结顾客普遍认可的优点和主要抱怨的缺点（各不超过3条），不要逐条复述原文，只输出总结本身。\n\n${reviewText}`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : "";
}
