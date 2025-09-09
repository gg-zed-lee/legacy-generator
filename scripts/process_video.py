import cv2
import sys
import os
import pytesseract
import json
import pandas as pd
from io import StringIO
import re

def preprocess_image(image):
    """Applies grayscale and thresholding to an image."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    # Using adaptive thresholding can be better for varying lighting conditions
    binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    return binary

def parse_positional_data(df):
    """
    Parses a DataFrame of OCR data with coordinates to extract structured information.
    This is a conceptual, simplified parser based on positional assumptions.
    A real implementation would need more sophisticated logic to handle different layouts.
    """
    data = {
        "tournamentInfo": {"name": "Unknown Tournament", "blinds": "", "ante": 0},
        "players": [],
        "actions": [], # To be implemented
        "board": [],
        "result": {"winner": "", "pot": 0, "winningHand": ""}
    }

    # Remove low confidence words
    df = df[df.conf > 40]

    # A very basic assumption: pot is usually a number near the center of the screen
    height, width = int(df['height'].max()), int(df['width'].max())
    center_x, center_y = width / 2, height / 2

    for i, row in df.iterrows():
        # Find "Pot:" label and look for a number nearby
        if 'Pot' in row['text']:
            # Search for a number in the vicinity to the right
            search_box_x = row['left'] + row['width']
            search_box_y = row['top']

            nearby_words = df[(df['left'] > search_box_x) & (df['left'] < search_box_x + 150) & (abs(df['top'] - search_box_y) < 20)]
            for _, word_row in nearby_words.iterrows():
                pot_text = re.sub(r'[^0-9]', '', word_row['text'])
                if pot_text.isdigit():
                    data['result']['pot'] = int(pot_text)
                    break
            if data['result']['pot'] > 0:
                break

    # This is still a placeholder for a real implementation.
    # A robust parser would group words into lines and regions and analyze them.
    # For now, we'll return the pot and a raw text dump.

    return data


def analyze_video_frames(video_path, timestamps):
    """
    Extracts frames, performs OCR with positional data, and parses it.
    """
    if not os.path.exists(video_path):
        print(f"Error: Video file not found at {video_path}", file=sys.stderr)
        sys.exit(1)

    vidcap = cv2.VideoCapture(video_path)
    if not vidcap.isOpened():
        print(f"Error: Could not open video file {video_path}", file=sys.stderr)
        sys.exit(1)

    full_text = ""
    # In a real scenario, we would merge data from multiple frames.
    # For this PoC, we'll just parse the last successful frame.
    final_parsed_data = {}

    for t in timestamps:
        vidcap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        success, image = vidcap.read()
        if success:
            processed_image = preprocess_image(image)

            try:
                # Get structured data with bounding boxes
                ocr_data_tsv = pytesseract.image_to_data(processed_image, output_type=pytesseract.Output.TSV)
                df = pd.read_csv(StringIO(ocr_data_tsv), sep='\t')

                # Basic text reconstruction for raw output
                frame_text = " ".join(df.dropna(subset=['text'])['text'])
                full_text += f"--- OCR for frame at {t}s ---\n{frame_text}\n\n"

                final_parsed_data = parse_positional_data(df)

            except Exception as e:
                print(f"Error during OCR/parsing for frame at {t}s: {e}", file=sys.stderr)
        else:
            print(f"Warning: Could not extract frame at {t}s.", file=sys.stderr)

    vidcap.release()
    return full_text, final_parsed_data


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python process_video.py <video_path>", file=sys.stderr)
        sys.exit(1)

    video_file = sys.argv[1]
    timestamps_to_extract = [1, 3, 5] # In a real app, this could be more dynamic

    # 1. Analyze frames to get raw text and parsed data
    raw_text, parsed_data = analyze_video_frames(video_file, timestamps_to_extract)

    # 2. Combine into a single JSON object
    final_output = {
        "raw_text": raw_text,
        "parsed_data": parsed_data
    }

    # 3. Print the final JSON to stdout
    print(json.dumps(final_output, indent=2))
