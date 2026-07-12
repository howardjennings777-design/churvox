import unittest

from backend.churvox_checkout_token_session_guard import _extract_token


class CheckoutTokenGuardTest(unittest.TestCase):
    def test_extracts_json_token(self):
        body = b'{"token":"access-json","plan":"pro"}'
        self.assertEqual(_extract_token(body, "application/json"), "access-json")

    def test_extracts_form_token(self):
        body = b'plan=pro&token=access-form&country=NZ'
        self.assertEqual(_extract_token(body, "application/x-www-form-urlencoded"), "access-form")

    def test_invalid_body_does_not_invent_token(self):
        self.assertEqual(_extract_token(b'{bad', "application/json"), "")
        self.assertEqual(_extract_token(b'plan=pro', "application/x-www-form-urlencoded"), "")


if __name__ == "__main__":
    unittest.main()
