import logging
import json
from django.conf import settings

logger = logging.getLogger(__name__)

class SentimentService:
    @staticmethod
    def analyze_sentiment(subject, description, messages=None):
        """
        Analyze ticket content and history to determine customer sentiment and sentiment score.
        Returns (sentiment_str, sentiment_score).
        """
        text = f"{subject} {description}".lower()
        if messages:
            for m in messages:
                # support both string message content and dict format
                if isinstance(m, dict):
                    text += f" {m.get('content', '')}".lower()
                elif hasattr(m, 'content'):
                    text += f" {m.content}".lower()
        
        # Default sentiment and scores
        sentiment = "Neutral"
        score = 0.0
        
        # Keyword-based check
        if any(w in text for w in ['angry', 'furious', 'terrible', 'useless', 'unacceptable', 'worst', 'hate', 'awful']):
            sentiment = "Angry"
            score = 0.9
        elif any(w in text for w in ['urgent', 'asap', 'emergency', 'immediate', 'blocker', 'critical', 'fire']):
            sentiment = "Urgent"
            score = 0.8
        elif any(w in text for w in ['frustrated', 'annoyed', 'delay', 'days', 'unusable', 'broken', 'disappointed']):
            sentiment = "Frustrated"
            score = 0.6
        elif any(w in text for w in ['worried', 'concerned', 'issue', 'problem', 'help', 'question', 'fear']):
            sentiment = "Concerned"
            score = 0.3
            
        # Try Groq if api key is available
        api_key = getattr(settings, 'GROQ_API_KEY', None)
        if api_key:
            try:
                from groq import Groq
                client = Groq(api_key=api_key)
                model = getattr(settings, 'GROQ_MODEL', 'llama-3.3-70b-versatile')
                messages_json = ""
                if messages:
                    if isinstance(messages[0], dict):
                        messages_json = json.dumps(messages[:10])
                    else:
                        messages_json = json.dumps([{'content': m.content} for m in messages[:10]])
                
                prompt = f"""Analyze the user's emotional state in this customer support request:
Subject: {subject}
Description: {description}
Messages: {messages_json}

Classify the sentiment into exactly one of: Neutral, Concerned, Frustrated, Angry, Urgent.
Provide a float score between 0.0 (Neutral/Positive) and 1.0 (Angry/Urgent).
Return valid JSON only (no markdown code blocks, no backticks, no extra text):
{{
  "sentiment": "Neutral",
  "score": 0.0
}}"""
                completion = client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.1,
                    max_tokens=150
                )
                raw = completion.choices[0].message.content.strip()
                if raw.startswith('```'):
                    raw = raw.split('```')[1]
                    if raw.startswith('json'):
                        raw = raw[4:]
                res = json.loads(raw.strip())
                if res.get('sentiment') in ["Neutral", "Concerned", "Frustrated", "Angry", "Urgent"]:
                    sentiment = res.get('sentiment')
                    score = float(res.get('score', 0.0))
            except Exception as e:
                logger.error(f"Groq sentiment analysis failed: {e}")
                
        return sentiment, score
