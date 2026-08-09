import React from "react";
import ReactDOM from "react-dom/client";
import ProductRouter from "./ProductRouter";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ProductRouter />
  </React.StrictMode>,
);
