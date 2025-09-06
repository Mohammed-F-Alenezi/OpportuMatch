import pandas as pd

# Adjust path if needed
path = "back/models/cohort_index.parquet.gz"

df = pd.read_parquet(path)

print("=== Cohort file info ===")
print(df.shape)           # rows, cols
print(df.columns.tolist())  # list all column names

print("\nSample rows:")
print(df.head(5))          # print first 5 rows
