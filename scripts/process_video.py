import cv2
import sys
import os
import pytesseract
import re
import json
from PIL import Image

def parse_ocr_text(text):
    """
    Parses raw OCR text to extract structured hand history data by iterating line by line.
    """
    data = {
        "tournamentInfo": {"name": "Unknown Tournament", "blinds": "", "ante": 0},
        "players": [],
        "actions": [],
        "board": [],
        "result": {"winner": "", "pot": 0, "winningHand": ""}
    }
    current_street = "preflop"
    lines = text.split('\n')

    action_patterns = [
        re.compile(r"(.+?): folds"),
        re.compile(r"(.+?): checks"),
        re.compile(r"(.+?): calls (\d+)"),
        re.compile(r"(.+?): bets (\d+)"),
        re.compile(r"(.+?): raises to (\d+)"),
    ]

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Tournament Info
        if line.startswith("Tournament:"):
            data["tournamentInfo"]["name"] = line.split(":", 1)[1].strip()
        elif line.startswith("Blinds:"):
            data["tournamentInfo"]["blinds"] = line.split(":", 1)[1].strip()

        # Player Info
        elif "Seat" in line and ":" in line:
            match = re.search(r"Seat (\d+): (.+?) \((\d+(\.\d+)?k?K?)\s?(chips)?\)", line)
            if match:
                stack_str = match.group(3).replace('k', '000').replace('K', '000')
                data["players"].append({
                    "seat": int(match.group(1)), "name": match.group(2).strip(),
                    "stack": float(stack_str), "cards": []
                })

        # Street Markers
        elif line.startswith("** PRE-FLOP **"):
            current_street = "preflop"
        elif line.startswith("** FLOP **"):
            current_street = "flop"
            board_match = re.search(r"\[(.+?)\]", line)
            if board_match:
                data["board"] = board_match.group(1).strip().split()
        elif line.startswith("** TURN **"):
            current_street = "turn"
        elif line.startswith("** RIVER **"):
            current_street = "river"

        # Actions
        else:
            found_action = False
            for i, pattern in enumerate(action_patterns):
                match = pattern.search(line)
                if match:
                    player_name = match.group(1).strip()
                    action = ""
                    amount = 0
                    if i == 0: action = "fold"
                    elif i == 1: action = "check"
                    elif i == 2: action = "call"; amount = int(match.group(2))
                    elif i == 3: action = "bet"; amount = int(match.group(2))
                    elif i == 4: action = "raise"; amount = int(match.group(2))

                    action_obj = {"street": current_street, "player": player_name, "action": action}
                    if amount > 0:
                        action_obj["amount"] = amount
                    data["actions"].append(action_obj)
                    found_action = True
                    break
            if found_action:
                continue

        # Pot and Winner
        if "Total pot" in line:
            pot_match = re.search(r"(\d+)", line)
            if pot_match:
                data["result"]["pot"] = int(pot_match.group(1))
        elif "Winner:" in line:
            data["result"]["winner"] = line.split(":", 1)[1].strip()

    return data

def extract_and_ocr_frames(video_path, timestamps, output_dir):
    """
    Extracts frames from a video file at given timestamps.

    Args:
        video_path (str): The path to the video file.
        timestamps (list): A list of timestamps in seconds to extract frames from.
        output_dir (str): The directory to save the extracted frames.
    """
    if not os.path.exists(video_path):
        print(f"Error: Video file not found at {video_path}", file=sys.stderr)
        sys.exit(1)

    vidcap = cv2.VideoCapture(video_path)
    if not vidcap.isOpened():
        print(f"Error: Could not open video file {video_path}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(output_dir, exist_ok=True)

    all_ocr_text = ""
    for t in timestamps:
        vidcap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        success, image = vidcap.read()
        if success:
            # Pre-process the image for better OCR results
            gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

            # Apply thresholding to get a binary image
            _, binary_image = cv2.threshold(gray_image, 150, 255, cv2.THRESH_BINARY)

            # Save the pre-processed image for debugging if needed
            # preprocessed_path = os.path.join(output_dir, f"preprocessed_frame_{t}s.jpg")
            # cv2.imwrite(preprocessed_path, binary_image)

            try:
                # Perform OCR on the pre-processed image
                # We pass the image directly to pytesseract without saving it first
                ocr_text = pytesseract.image_to_string(binary_image)
                all_ocr_text += f"--- OCR for frame at {t}s ---\n"
                all_ocr_text += ocr_text + "\n\n"
            except Exception as e:
                print(f"Error during OCR for frame at {t}s: {e}", file=sys.stderr)
        else:
            print(f"Warning: Could not extract frame at {t}s.", file=sys.stderr)

    vidcap.release()
    return all_ocr_text

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python process_video.py <video_path> [output_dir]", file=sys.stderr)
        sys.exit(1)

    video_file = sys.argv[1]

    # Use a default output directory if not provided
    output_directory = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(video_file), 'frames')

    # For this proof-of-concept, we'll extract frames at 1, 3, and 5 seconds.
    # In a real application, this would be more dynamic.
    timestamps_to_extract = [1, 3, 5]

    # 1. Extract and OCR text from frames
    ocr_text = extract_and_ocr_frames(video_file, timestamps_to_extract, output_directory)

    # 2. Parse the OCR text
    parsed_data = parse_ocr_text(ocr_text)

    # 3. Combine raw text and parsed data into a single JSON object
    final_output = {
        "raw_text": ocr_text,
        "parsed_data": parsed_data
    }

    # 4. Print the final JSON to stdout
    print(json.dumps(final_output, indent=2))
