"""
Tests for AI provider functionality.

Note: These tests focus on prompt building and JSON parsing.
Full integration tests with real APIs are skipped to avoid complexity and API costs.
"""
from __future__ import annotations

from django.test import TestCase

from apps.content.ai_providers import (
    AIProviderException,
    _build_story_prompt,
    _safe_json_loads,
)
from apps.content.models import StoryAIProviderConfig


class AIProviderUtilsTest(TestCase):
    """Tests for AI provider utility functions"""

    def test_build_story_prompt_from_prompt(self):
        """Test building prompt from user prompt"""
        prompt_data = {
            'mode': 'prompt',
            'prompt': 'a weekend in Paris'
        }

        prompt = _build_story_prompt(prompt_data)

        self.assertIn('Paris', prompt)
        self.assertIn('JSON', prompt)
        self.assertIn('title', prompt)
        self.assertIn('content', prompt)
        self.assertIn('tags', prompt)
        self.assertIn('location', prompt)

    def test_build_story_prompt_with_empty_prompt(self):
        """Test building prompt with empty user prompt"""
        prompt_data = {
            'mode': 'prompt',
            'prompt': ''
        }

        prompt = _build_story_prompt(prompt_data)

        # Should use default text
        self.assertIn('une escapade créative', prompt)

    def test_build_story_prompt_from_itinerary(self):
        """Test building prompt from itinerary"""
        prompt_data = {
            'mode': 'itinerary',
            'itinerary': {
                'title': 'European Adventure',
                'itinerary_data': {
                    'trip': {
                        'destinations': [
                            {'city': 'Paris', 'country': 'France'},
                            {'city': 'Rome', 'country': 'Italy'}
                        ]
                    }
                }
            }
        }

        prompt = _build_story_prompt(prompt_data)

        self.assertIn('Paris', prompt)
        self.assertIn('Rome', prompt)
        self.assertIn('European Adventure', prompt)
        self.assertIn('JSON', prompt)
        self.assertIn('800 mots', prompt)  # Should ask for longer content

    def test_build_story_prompt_itinerary_with_fallback(self):
        """Test building prompt from itinerary with missing destinations"""
        prompt_data = {
            'mode': 'itinerary',
            'itinerary': {
                'title': 'Mystery Trip',
                'itinerary_data': {}
            }
        }

        prompt = _build_story_prompt(prompt_data)

        # Should handle missing destinations gracefully
        self.assertIn('Mystery Trip', prompt)
        self.assertIn('JSON', prompt)

    def test_safe_json_loads_valid(self):
        """Test parsing valid JSON"""
        json_str = '{"title": "Test", "content": "Content"}'
        result = _safe_json_loads(json_str)

        self.assertIsNotNone(result)
        self.assertEqual(result['title'], 'Test')
        self.assertEqual(result['content'], 'Content')

    def test_safe_json_loads_with_extra_text_before(self):
        """Test parsing JSON with text before it"""
        text_with_json = 'Here is the story: {"title": "Test", "content": "Content"}'
        result = _safe_json_loads(text_with_json)

        self.assertIsNotNone(result)
        self.assertEqual(result['title'], 'Test')

    def test_safe_json_loads_with_extra_text_after(self):
        """Test parsing JSON with text after it"""
        text_with_json = '{"title": "Test", "content": "Content"} Hope you like it!'
        result = _safe_json_loads(text_with_json)

        self.assertIsNotNone(result)
        self.assertEqual(result['title'], 'Test')

    def test_safe_json_loads_invalid(self):
        """Test that invalid JSON raises exception"""
        invalid_json = 'This is not JSON at all, no curly braces here'

        with self.assertRaises(AIProviderException) as context:
            _safe_json_loads(invalid_json)

        self.assertIn('parser', str(context.exception).lower())

    def test_safe_json_loads_none(self):
        """Test that None returns None"""
        result = _safe_json_loads(None)
        self.assertIsNone(result)

    def test_safe_json_loads_empty_string(self):
        """Test that empty string returns None"""
        result = _safe_json_loads('')
        self.assertIsNone(result)


class StoryAIProviderConfigTest(TestCase):
    """Tests for AI provider configuration model"""

    def setUp(self):
        """Clear existing providers created by seed migration"""
        StoryAIProviderConfig.objects.all().delete()

    def test_provider_creation(self):
        """Test creating an AI provider config"""
        provider = StoryAIProviderConfig.objects.create(
            provider=StoryAIProviderConfig.Provider.OPENAI,
            display_name='OpenAI',
            is_enabled=True,
            model_name='gpt-4o-mini',
            temperature=0.75
        )

        self.assertEqual(provider.provider, 'openai')
        self.assertEqual(provider.display_name, 'OpenAI')
        self.assertTrue(provider.is_enabled)
        self.assertEqual(float(provider.temperature), 0.75)
        self.assertEqual(provider.model_name, 'gpt-4o-mini')

    def test_unique_provider_constraint(self):
        """Test that provider names must be unique"""
        StoryAIProviderConfig.objects.create(
            provider=StoryAIProviderConfig.Provider.OPENAI,
            display_name='OpenAI',
            model_name='gpt-4o-mini'
        )

        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            StoryAIProviderConfig.objects.create(
                provider=StoryAIProviderConfig.Provider.OPENAI,
                display_name='OpenAI Duplicate',
                model_name='gpt-4'
            )

    def test_provider_defaults(self):
        """Test default values for provider config"""
        provider = StoryAIProviderConfig.objects.create(
            provider=StoryAIProviderConfig.Provider.GEMINI,
            display_name='Gemini'
        )

        self.assertFalse(provider.is_enabled)  # Default is False (unless seeded differently)
        self.assertEqual(provider.metadata, {})  # Default empty dict
        self.assertIsNotNone(provider.created_at)
        self.assertIsNotNone(provider.updated_at)

    def test_temperature_range(self):
        """Test that temperature accepts decimal values"""
        provider = StoryAIProviderConfig.objects.create(
            provider=StoryAIProviderConfig.Provider.PERPLEXITY,
            display_name='Perplexity',
            temperature=0.50
        )

        self.assertEqual(float(provider.temperature), 0.50)

        # Test updating temperature
        provider.temperature = 0.90
        provider.save()
        provider.refresh_from_db()
        self.assertEqual(float(provider.temperature), 0.90)


# Skip complex integration tests that require mocking external APIs
# These would be better as integration tests run separately
