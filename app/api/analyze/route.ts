import { NextResponse } from "next/server";
import { Buffer } from "buffer";

export async function POST(req: Request) {
  try {
    //----------------------------------
    // Get Form Data
    //----------------------------------

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "Missing OpenRouter API key" },
        { status: 500 }
      );
    }

    //----------------------------------
    // Convert Image to Base64
    //----------------------------------

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");

    //----------------------------------
    // Call OpenRouter Vision Model
    //----------------------------------

    const aiResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          temperature: 0.1,
          max_tokens: 300,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `
Analyze this urine test strip.

Pads from left to right:
1 Nitrite
2 Leukocytes
3 pH

Return ONLY JSON:

{
 "nitrite":"Positive or Negative",
 "leukocytes":"Low or Moderate or High",
 "ph":"Acidic or Neutral or Alkaline"
}
                  `,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${file.type};base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    //----------------------------------
    // Handle API Errors
    //----------------------------------

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("OpenRouter API Error:", errorText);

      return NextResponse.json(
        { error: "AI service failed" },
        { status: 500 }
      );
    }

    const data = await aiResponse.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty AI response");
    }

    //----------------------------------
    // Extract JSON safely
    //----------------------------------

    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error("AI RAW RESPONSE:", content);
      throw new Error("AI did not return valid JSON");
    }

    let ai;
    try {
      ai = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("JSON Parse Error:", jsonMatch[0]);
      throw new Error("Failed to parse AI JSON");
    }

    //----------------------------------
    // ROBUST MEDICAL RISK MODEL
    //----------------------------------

    let risk = 10;

    if (ai.nitrite === "Positive") risk += 40;

    if (ai.leukocytes === "Moderate") risk += 15;
    if (ai.leukocytes === "High") risk += 25;

    if (ai.ph === "Alkaline") risk += 10;
    if (ai.ph === "Acidic") risk += 5;

    if (risk > 95) risk = 95;
    if (risk < 5) risk = 5;

    //----------------------------------
    // Risk Level
    //----------------------------------

    let level = "Low";

    if (risk >= 70) level = "High";
    else if (risk >= 40) level = "Moderate";

    //----------------------------------
    // Detailed Clinical Explanation
    //----------------------------------

    let explanation = `Nitrite: ${ai.nitrite}. `;

    if (ai.nitrite === "Positive") {
      explanation +=
        "A positive nitrite result suggests the presence of bacteria that convert nitrates into nitrites, commonly associated with urinary tract infections (UTIs). ";
    } else {
      explanation +=
        "A negative nitrite result reduces the likelihood of certain bacterial UTIs, although infection cannot be completely ruled out. ";
    }

    explanation += `Leukocytes: ${ai.leukocytes}. `;

    if (ai.leukocytes === "High") {
      explanation +=
        "High leukocyte levels indicate significant white blood cell activity, suggesting inflammation or infection in the urinary tract. ";
    } else if (ai.leukocytes === "Moderate") {
      explanation +=
        "Moderate leukocyte levels may indicate mild inflammation or early-stage infection. ";
    } else {
      explanation +=
        "Low leukocyte levels are generally considered normal and suggest minimal inflammatory response. ";
    }

    explanation += `pH: ${ai.ph}. `;

    if (ai.ph === "Alkaline") {
      explanation +=
        "Alkaline urine may be associated with certain bacterial infections or dietary influences. ";
    } else if (ai.ph === "Acidic") {
      explanation +=
        "Acidic urine is commonly seen with normal metabolism and certain dietary patterns. ";
    } else {
      explanation +=
        "Neutral pH falls within a typical physiological range for many individuals. ";
    }

    //----------------------------------
    // Structured Guidance (Exactly 3)
    //----------------------------------

    let guidanceList = [];

    guidanceList.push(
      "1. Increase fluid intake to help flush the urinary tract and reduce bacterial concentration."
    );

    guidanceList.push(
      "2. Monitor for symptoms such as burning during urination, urgency, frequency, or lower abdominal discomfort."
    );

    if (level === "High") {
      guidanceList.push(
        "3. Seek medical consultation promptly for urine culture testing and appropriate antibiotic treatment."
      );
    } else if (level === "Moderate") {
      guidanceList.push(
        "3. Consider consulting a healthcare provider if symptoms persist or worsen."
      );
    } else {
      guidanceList.push(
        "3. Maintain good personal hygiene and reassess if symptoms develop."
      );
    }

    let guidance = guidanceList.join(" ");

    //----------------------------------
    // Final Response
    //----------------------------------

    return NextResponse.json({
      nitrite: ai.nitrite,
      leukocytes: ai.leukocytes,
      ph: ai.ph,

      risk_score: risk,
      risk_level: level,

      clinical_explanation: explanation,
      guidance: guidance,
    });

  } catch (error: any) {
    console.error("ANALYZE ROUTE ERROR:", error);

    return NextResponse.json(
      { error: error.message || "Analysis failed" },
      { status: 500 }
    );
  }
}