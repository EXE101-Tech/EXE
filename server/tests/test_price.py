import unittest
from datetime import datetime, timedelta

from pydantic import ValidationError
from app.schemas import MatchCreate, normalize_cost_thousands


class PriceTests(unittest.TestCase):
    def test_shorthand_and_vnd_have_the_same_value(self):
        for value in ('50', '50.000', '50000'):
            with self.subTest(value=value):
                self.assertEqual(normalize_cost_thousands(value), '50000')

    def test_normalized_cost_can_be_sent_back_without_inflation(self):
        for value in ('0', '50', '1000', '1.000', '1.000.000', '1000000'):
            with self.subTest(value=value):
                start = datetime(2026, 10, 20, 12)
                room = MatchCreate(title='Test cost', sport_id=1, required_level='Beginner',
                                   start_time=start, end_time=start + timedelta(hours=1),
                                   max_players=4, price_info=value)
                self.assertEqual(MatchCreate.model_validate(room.model_dump()).price_info, room.price_info)

    def test_invalid_and_fractional_costs_are_rejected(self):
        for value in ('', '-50', '50.5', '50,5', '50001', 'abc'):
            with self.subTest(value=value), self.assertRaises((ValueError, ValidationError)):
                normalize_cost_thousands(value)
