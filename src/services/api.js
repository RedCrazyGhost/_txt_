import axios from "axios";

export async function getQuestionJSON(filepath) {
  const cleanPath = filepath.replace(/^\/+/, "");
  const url = `${import.meta.env.BASE_URL}${cleanPath}.json`;
  const response = await axios.get(url);
  return response.data;
}
