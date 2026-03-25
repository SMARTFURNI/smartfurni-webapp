import NpsSurveyPublic from "@/components/crm/nps/NpsSurveyPublic";

export default async function NpsSurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NpsSurveyPublic surveyId={id} />;
}
