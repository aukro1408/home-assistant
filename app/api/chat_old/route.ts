import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;
    const appContext = body.appContext || {};

    // Format app context for AI
    const contextInfo = `
Current App Data:
- Electricity Price: ${appContext.electricityPrice || 'N/A'} ₴/kWh
- Water Price: ${appContext.waterPrice || 'N/A'} ₴/м³
- Current Electricity Month: ${appContext.electricityMonth || 'N/A'}/${appContext.electricityYear || 'N/A'}
- Current Water Month: ${appContext.waterMonth || 'N/A'}/${appContext.waterYear || 'N/A'}

Electricity Data (by month): ${JSON.stringify(appContext.electricityData || {})}
Water Data (by month): ${JSON.stringify(appContext.waterData || {})}
Planner Tasks: ${JSON.stringify(appContext.plannerTasks || {})}
`;

    const completion = await openai.chat.completions.create({
      model: "openai/gpt-oss-120b:free",

      messages: [
        {
          role: "system",
          content: `You are PaciukHome AI — a smart personal dashboard assistant.

You help with:
- home management
- electricity and water tracking
- planner/tasks
- dashboard analytics
- general AI questions

You have access to the user's real app data. Use this data to provide accurate, specific answers about their electricity usage, water consumption, costs, and tasks.

${contextInfo}

Reply briefly and helpfully. When answering about usage or costs, reference the actual data provided above.`,
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const response =
      completion.choices[0]?.message?.content ||
      "No response";

    return Response.json({
      reply: response,
    });

  } catch (error) {
    console.log(error);

    return Response.json({ error: "AI error" }, { status: 500 });
  }
}