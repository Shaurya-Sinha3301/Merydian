export default function POIDetail({ params }: { params: { poiId: string } }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">POI Detail</h1>
      <p>POI ID: {params.poiId}</p>
      <p>Coming soon...</p>
    </div>
  );
}