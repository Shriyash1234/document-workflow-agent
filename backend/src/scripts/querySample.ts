import dotenv from "dotenv";
import { QueryAgent } from "../agents/queryAgent.js";

dotenv.config();

const question = process.argv.slice(2).join(" ") || "how many shipments were flagged this week?";
const result = await new QueryAgent().answer(question);

console.log(JSON.stringify(result, null, 2));
