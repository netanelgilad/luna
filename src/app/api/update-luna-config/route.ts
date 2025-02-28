import { NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const configUpdates = await req.json();
    
    // Path to Luna's configuration file
    const configPath = path.join(process.cwd(), 'src/app/agentConfigs/personalAssistant/luna-config.json');
    
    // Read current configuration
    let lunaConfig;
    try {
      lunaConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error: any) {
      return NextResponse.json(
        { 
          status: "error", 
          message: `Failed to read configuration file: ${error.message}` 
        }, 
        { status: 500 }
      );
    }
    
    // Track which fields were updated
    const updatedFields: Record<string, any> = {};
    
    // Apply updates to the configuration
    if (configUpdates.name) {
      lunaConfig.name = configUpdates.name;
      updatedFields.name = configUpdates.name;
    }
    
    if (configUpdates.publicDescription) {
      lunaConfig.publicDescription = configUpdates.publicDescription;
      updatedFields.publicDescription = configUpdates.publicDescription;
    }
    
    if (configUpdates.personalityTraits) {
      lunaConfig.personality.traits = configUpdates.personalityTraits;
      updatedFields.personalityTraits = configUpdates.personalityTraits;
    }
    
    if (configUpdates.communicationStyle) {
      lunaConfig.personality.communicationStyle = configUpdates.communicationStyle;
      updatedFields.communicationStyle = configUpdates.communicationStyle;
    }
    
    if (configUpdates.voiceCharacteristics) {
      if (configUpdates.voiceCharacteristics.pace) {
        lunaConfig.voice.speakingPace = configUpdates.voiceCharacteristics.pace;
        updatedFields.speakingPace = configUpdates.voiceCharacteristics.pace;
      }
      
      if (configUpdates.voiceCharacteristics.tone) {
        lunaConfig.voice.tone = configUpdates.voiceCharacteristics.tone;
        updatedFields.tone = configUpdates.voiceCharacteristics.tone;
      }
    }
    
    if (configUpdates.responsePreferences) {
      if (configUpdates.responsePreferences.timeFormat) {
        lunaConfig.responsePref.timeFormat = configUpdates.responsePreferences.timeFormat;
        updatedFields.timeFormat = configUpdates.responsePreferences.timeFormat;
      }
      
      if (configUpdates.responsePreferences.unitSystem) {
        lunaConfig.responsePref.unitSystem = configUpdates.responsePreferences.unitSystem;
        updatedFields.unitSystem = configUpdates.responsePreferences.unitSystem;
      }
      
      if (configUpdates.responsePreferences.detailLevel) {
        // Map detailLevel to adaptDetailLevel boolean
        lunaConfig.responsePref.adaptDetailLevel = configUpdates.responsePreferences.detailLevel === "adaptive";
        updatedFields.adaptDetailLevel = lunaConfig.responsePref.adaptDetailLevel;
      }
    }
    
    // Check if any updates were provided
    if (Object.keys(updatedFields).length === 0) {
      return NextResponse.json(
        { 
          status: "error", 
          message: "No valid update fields provided. Please specify at least one field to update." 
        }, 
        { status: 400 }
      );
    }
    
    // Write the updated configuration back to the file
    try {
      fs.writeFileSync(configPath, JSON.stringify(lunaConfig, null, 2), 'utf8');
      return NextResponse.json({
        status: "success",
        message: "Configuration updated and saved to file successfully",
        updatedFields: updatedFields
      });
    } catch (error: any) {
      return NextResponse.json(
        { 
          status: "error", 
          message: `Failed to write configuration to file: ${error.message}`,
          updatedFields: updatedFields
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

