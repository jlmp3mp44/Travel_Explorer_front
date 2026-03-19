import { useParams, useNavigate } from "react-router-dom";

function TripDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div style={{ padding: "20px" }}>
      <h1>Trip Details</h1>
      <p>Trip ID: {id}</p>

      <p>Here will be full trip plan (hotels, places, food etc)</p>

      <button onClick={() => navigate("/")}>Back</button>
    </div>
  );
}

export default TripDetails;