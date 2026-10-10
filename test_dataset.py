
import pandas as pd

df = pd.read_csv("courses.csv")

print("Total Courses:", len(df))
print("\nAvailable Courses:")
print(df[["course_name", "field", "duration", "fees"]].to_string(index=False))