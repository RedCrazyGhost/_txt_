import axios from "axios";

export async function createQuestionBankIssue({
  token,
  owner,
  repo,
  bank
}) {
  const title = `[题库] ${bank.title || "未命名题库"} - ${bank.subject || "未分类"}`;
  const body = [
    "## 题库信息",
    `- 标题: ${bank.title || "-"}`,
    `- 学科: ${bank.subject || "-"}`,
    `- 编者: ${bank.author || "-"}`,
    `- 更新时间: ${bank.updatedAt}`,
    "",
    "## 题目内容(JSON)",
    "```json",
    JSON.stringify(
      {
        title: bank.title,
        subject: bank.subject,
        author: bank.author,
        questions: bank.questions
      },
      null,
      2
    ),
    "```"
  ].join("\n");

  const response = await axios.post(
    `https://api.github.com/repos/${owner}/${repo}/issues`,
    {
      title,
      body,
      labels: ["question-bank", "upload-from-_txt_"]
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    }
  );
  return response.data;
}

