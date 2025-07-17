import os
from dotenv import load_dotenv
import kagglehub
import pandas as pd
import sqlite3
import re

# Load environment variables from .env file
load_dotenv()

# Download latest version
dataset_id = os.getenv("JEOPARDY_DATASET_ID")
if not dataset_id:
    raise ValueError("JEOPARDY_DATASET_ID is not set in the environment variables")
path = kagglehub.dataset_download(dataset_id)
print("Path to dataset files:", path)

# Find the CSV file (assume it's the only .csv in the directory)
csv_file = None
for file in os.listdir(path):
    if file.endswith('.csv'):
        csv_file = os.path.join(path, file)
        break
if not csv_file:
    raise FileNotFoundError("No CSV file found in the dataset directory.")
print("Found CSV file:", csv_file)

# Load CSV into pandas DataFrame
df = pd.read_csv(csv_file)
print(f"Loaded {len(df)} rows from CSV.")

# Clean up column names: strip, lowercase, replace spaces with underscores
df.columns = [col.strip().lower().replace(' ', '_') for col in df.columns]

# Optionally, rename columns to standard names if needed
rename_map = {
    'show_number': 'show_number',
    'air_date': 'air_date',
    'round': 'round',
    'category': 'category',
    'value': 'value',
    'question': 'question',
    'answer': 'answer',
}
df = df.rename(columns=rename_map)

# Convert 'value' column to integer (or None)
def parse_value(val):
    if pd.isna(val):
        return None
    val = str(val).strip()
    if val.startswith('$'):
        try:
            return int(val.replace('$', '').replace(',', ''))
        except ValueError:
            return None
    return None

df['value'] = df['value'].apply(parse_value)

df['round'] = df['round'].apply(lambda x: re.sub(r'[^a-zA-Z0-9]', '', str(x)).lower())

# Remove normalize_round and do not alter the 'round' column

# Create data directory if it doesn't exist
data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
os.makedirs(data_dir, exist_ok=True)
db_path = os.path.join(data_dir, 'jeopardy.db')

# Load into SQLite
db_conn = sqlite3.connect(db_path)
df.to_sql('clues', db_conn, if_exists='replace', index=False)
db_conn.close()
print(f"Loaded data into SQLite database at {db_path}") 