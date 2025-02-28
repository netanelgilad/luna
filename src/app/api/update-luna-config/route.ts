import { NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    // Extract the instructions from the request body
    const { instructions } = await req.json();
    
    // Validate that instructions were provided
    if (!instructions) {
      return NextResponse.json(
        { 
          status: "error", 
          message: "No instructions provided in the request body." 
        }, 
        { status: 400 }
      );
    }
    
    // Path to Luna's instructions file
    const filePath = path.join(process.cwd(), 'src/app/agentConfigs/personalAssistant/luna-instructions.json');
    
    // Create the JSON structure with the instructions field
    const configData = {
      instructions: instructions
    };
    
    // Write the instructions to the JSON file
    try {
      fs.writeFileSync(filePath, JSON.stringify(configData, null, 2), 'utf8');
      
      return NextResponse.json({
        status: "success",
        message: "Instructions updated and saved to file successfully"
      });
    } catch (error: any) {
      return NextResponse.json(
        { 
          status: "error", 
          message: `Failed to write instructions to file: ${error.message}`
        }, 
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in /update-luna-config:", error);
    return NextResponse.json(
      { error: error.message }, 
      { status: 500 }
    );
  }
}

