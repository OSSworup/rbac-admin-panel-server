import express from "express";
import cors from "cors";
const app=express();

app.use(express.json());
app.use(cors({
    origin:["http://localhost:5173","https://rbac-admin-panel-client.vercel.app"],
}))

app.get('/',(req,res)=>{
    res.send(`Hello`);
})

import userRoutes from "./routes/user.routes.js";
import roleRoutes from "./routes/role.routes.js";
app.use("/api/user",userRoutes);
app.use("/api/role",roleRoutes);

export default app;
