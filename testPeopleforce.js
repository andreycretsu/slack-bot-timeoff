import axios from "axios";

const API_URL = "https://app.peopleforce.io/api/public/v3";
const API_KEY = "sztRuV373XmhpeX7gfFd7HaPuxqX7mDfXnEodzBWcDM6LVt9hJwd";

(async () => {
  try {
    const res = await axios.get(`${API_URL}/employees`, {
      headers: {
        "X-API-KEY": API_KEY,
        "accept": "application/json"
      }
    });

    console.log("✅ Success!");
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("❌ Error:", err.response?.status, err.response?.data || err.message);
  }
})();