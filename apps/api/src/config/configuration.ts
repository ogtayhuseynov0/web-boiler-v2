export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
    jwtSecret: process.env.SUPABASE_JWT_SECRET,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },

  app: {
    apiUrl: process.env.API_URL || 'http://localhost:4000',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    webhookBaseUrl: process.env.TWILIO_WEBHOOK_BASE_URL,
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID,
  },

  verification: {
    provider: (process.env.PHONE_VERIFICATION_PROVIDER || 'twilio') as
      | 'supabase'
      | 'twilio',
  },

  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY,
    defaultVoiceId:
      process.env.ELEVENLABS_DEFAULT_VOICE_ID || '21m00Tcm4TlvDq8ikWAM', // Rachel
    modelId: process.env.ELEVENLABS_MODEL_ID || 'eleven_monolingual_v1',
    agentId: process.env.ELEVENLABS_AGENT_ID,
    webhookSecret: process.env.ELEVENLABS_WEBHOOK_SECRET,
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    embeddingModel:
      process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  },

  payments: {
    provider: (process.env.PAYMENT_PROVIDER || 'paddle') as 'paddle' | 'polar',
    paddle: {
      apiKey: process.env.PADDLE_API_KEY,
      webhookSecret: process.env.PADDLE_WEBHOOK_SECRET,
      priceId: process.env.PADDLE_PRICE_ID,
    },
    polar: {
      accessToken: process.env.POLAR_ACCESS_TOKEN,
      webhookSecret: process.env.POLAR_WEBHOOK_SECRET,
      productId: process.env.POLAR_PRODUCT_ID,
    },
  },

  callPricing: {
    costPerMinuteCents: parseInt(
      process.env.CALL_COST_PER_MINUTE_CENTS || '10',
      10,
    ), // $0.10/min default
  },
});
