import cv2
import sys
import os
import pytesseract
import json
import pandas as pd
from io import StringIO

def preprocess_image(image):
    """Applies grayscale and thresholding to an image."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
    return binary

def parse_positional_data(df):
    """
    Parses a DataFrame of OCR data with coordinates to extract structured information.
    This is a conceptual, simplified parser based on positional assumptions.
    """
    data = {
        "pot": 0,
        "players": [],
        "board": [],
        # Other fields would be added here
    }

    # Assume pot is usually near the center of the screen
    height, width = df.iloc[0]['height'], df.iloc[0]['width'] # A bit of a hack to get image size
    center_x = width / 2
    center_y = height / 2

    # Find text near the word "Pot:"
    try:
        pot_df = df[df['text'].str.contains('Pot:', na=False)]
        if not pot_df.empty:
            # Find the numeric value closest to the "Pot:" label
            pot_label_pos = pot_df.iloc[0]
            # This is a simplified search; a real one would be more robust
            # For now, we assume the next word is the pot value
            pot_value_series = df.iloc[pot_label_pos.name + 1]
            pot_text = pot_value_series['text']
            data['pot'] = int(re.sub(r'\D', '', pot_text))
    except (ValueError, IndexError):
        pass # Pot not found

    # Find player data (assuming it's in a vertical list on the left)
    # This is a very simplified example
    player_df = df[(df['left'] < width / 3) & (df['conf'] > 50)] # Words on the left third of the screen
    # A real implementation would group words by lines and parse those lines.

    # For this conceptual parser, we'll just return the pot for now.
    # A full implementation is beyond the scope of a single change.

    return data


def analyze_video_frames(video_path, timestamps, output_dir):
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

    os.makedirs(output_dir, exist_ok=True)

    full_text = ""
    parsed_data = {}

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

                # In a real scenario, we would merge data from multiple frames.
                # For this PoC, we'll just parse the last successful frame.
                parsed_data = parse_positional_data(df)

            except Exception as e:
                print(f"Error during OCR/parsing for frame at {t}s: {e}", file=sys.stderr)
        else:
            print(f"Warning: Could not extract frame at {t}s.", file=sys.stderr)

    vidcap.release()
    return full_text, parsed_data


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python process_video.py <video_path> [output_dir]", file=sys.stderr)
        sys.exit(1)

    video_file = sys.argv[1]
    output_directory = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(video_file), 'frames')
    timestamps_to_extract = [1, 3, 5]

    # 1. Analyze frames to get raw text and parsed data
    raw_text, parsed_data = analyze_video_frames(video_file, timestamps_to_extract, output_directory)

    # 2. Combine into a single JSON object
    final_output = {
        "raw_text": raw_text,
        "parsed_data": parsed_data
    }

    # 3. Print the final JSON to stdout
    print(json.dumps(final_output, indent=2))
