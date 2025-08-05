export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div>
      <h1>Room: {id}</h1>
      <p>Room functionality will be implemented here.</p>
    </div>
  )
}
