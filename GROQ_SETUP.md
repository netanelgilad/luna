# Groq AI Integration Setup

The WhatsApp Brief feature uses **Groq** with the **Llama 3.3 70B** model to generate intelligent summaries of your WhatsApp activity.

## Why Groq?

- ⚡ **Ultra-fast inference** (perfect for real-time summaries)
- 🆓 **Generous free tier** (6,000 requests/day)
- 🦙 **Excellent Llama 3.3 models** for summarization
- 🔧 **Simple API integration**
- 📊 **Good context window support**

## Setup Instructions

### 1. Get a Free Groq API Key

1. Visit [Groq Console](https://console.groq.com/keys)
2. Sign up for a free account
3. Create a new API key
4. Copy the API key

### 2. Configure Environment Variables

Create a `.env` file in your project root:

```bash
# Groq API Configuration
GROQ_API_KEY=your_groq_api_key_here
```

**Important:** Make sure to add `.env` to your `.gitignore` file to keep your API key secure.

### 3. Restart Your Development Server

After adding the environment variable, restart your dev server:

```bash
npm run dev
```

## How It Works

The AI Brief feature:

1. **Fetches** the latest 10 WhatsApp chats
2. **Retrieves** the last 10 messages from each chat
3. **Analyzes** all message content, timestamps, contact names, and context
4. **Generates** an intelligent summary using Llama 3.3 70B that includes:
   - **Summary**: Overview of current WhatsApp activity
   - **Needs Attention**: Urgent items requiring immediate action
   - **Low Priority**: Items that can be safely ignored
   - **Smart insights**: Time-sensitive messages, patterns, multiple attempts to reach you

## AI Prompt Engineering

The system uses a carefully engineered prompt that:

- Considers message recency and sender importance
- Identifies urgency keywords ("urgent", "important", "please call")
- Distinguishes between group chat activity and direct messages
- Recognizes patterns like multiple messages from the same person
- Provides actionable, specific recommendations

## Free Tier Limits

Groq's free tier includes:
- 6,000 requests per day
- Rate limiting of ~30 requests per minute
- No credit card required

This is more than sufficient for typical WhatsApp brief generation usage.

## Troubleshooting

### "Error Generating Brief"
- Check that your `GROQ_API_KEY` is correctly set in `.env`
- Verify your API key is valid at [Groq Console](https://console.groq.com/keys)
- Ensure you haven't exceeded the free tier limits

### API Rate Limits
- If you hit rate limits, wait a minute and try again
- The free tier allows ~30 requests per minute

### Authentication Issues
- Make sure WhatsApp is properly authenticated first
- The brief requires access to your chats and messages 