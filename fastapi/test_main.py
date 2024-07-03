import unittest
from main import extract_text_from_html, extract_redactable_entities, classify_text

class TestExtractTextFromHTML(unittest.TestCase):
    def test_extract_text(self):
        html_content = """
        <html>
            <head>
                <title>Test Title</title>
            </head>
            <body>
                <p>This is a <strong>test</strong> paragraph.</p>
                <br/>
                <p>This is a <strong>second</strong> paragraph.</p>
                <script>console.log("Ignore this script")</script>
                <style>body {background-color: #fff;}</style>
            </body>
        </html>
        """
        expected_output = "Test Title This is a test paragraph. This is a second paragraph."
        self.assertEqual(extract_text_from_html(html_content), expected_output)

    def test_classify_text(self):
        text = "yes"
        self.assertTrue(classify_text(text))

    def test_extract_redactable_entities(self):
        # Sample input
        direction = "extract all words that mean sample from the text."
        text = "This is a sample text with sample entities to extract for a sample."
        
        # Expected output
        expected_entities = ["sample"]  # Adjust based on the expected behavior of the function
        
        # Call the function
        actual_entities = extract_redactable_entities(direction, text)
        
        # Assert the expected output matches the actual output
        assert len(actual_entities) == 3, "The extracted entities do not match the expected entities."

if __name__ == '__main__':
    unittest.main()