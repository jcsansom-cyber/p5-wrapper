export async function GET() {
  return Response.json({
    providers: {
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
    },
  });
}
