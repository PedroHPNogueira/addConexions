import express from "express";
import { CreateConectionsService } from "./services/createConections.js";


const server = express();

server.use("/", async (req, res) => {
  const createConection = new CreateConectionsService();
  await createConection.handler(req, res)
})

server.listen(3000, () => {
  console.log("server rodando na porta 3000")
})

