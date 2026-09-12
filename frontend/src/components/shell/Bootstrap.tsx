"use client";

import React, { useEffect } from "react";
import { bootstrapApp } from "@/lib/bootstrap";

export const Bootstrap: React.FC = () => {
  useEffect(() => {
    void bootstrapApp();
  }, []);
  return null;
};

export default Bootstrap;