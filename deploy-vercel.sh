#!/usr/bin/env bash
# ==============================================================================
# AERO-SENSE // Automated Vercel Deployment Script for Linux / macOS / Git Bash
# Smart India Hackathon (SIH 2026) Project
# ==============================================================================

set -e

echo ""
echo "========================================================"
echo "  AERO-SENSE : AI Weather Sensor Anomaly Detection"
echo "  Initiating Automated Vercel Deployment"
echo "========================================================"
echo ""

# 1. Check Node
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed. Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "[1/3] Installing workspace dependencies..."
npm install
npm --prefix backend install
npm --prefix frontend install

echo "[2/3] Building production frontend with Vite..."
npm --prefix frontend run build

echo ""
echo "[3/3] Deploying to Vercel..."
echo "If this is your first time, Vercel CLI will prompt you to authenticate."
echo ""

npx vercel --prod

echo ""
echo "========================================================"
echo "  Deployment process completed successfully!"
echo "  Access your live dashboard at the Vercel URL printed above."
echo "========================================================"
echo ""
