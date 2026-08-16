import json
import pandas as pd

def generate_100_seed_data(test_path="dataset/llm_test_sample.csv", output_json="zenassist-app/javascript/src/database/seed-data.json"):
    df = pd.read_csv(test_path)
    
    # Échantillonnage équilibré de 100 réclamations représentatives
    categories = df["Tag_Clean"].unique()
    sampled_list = []
    
    # 1. Prendre 10 exemples par catégorie (ou le max disponible)
    for cat in sorted(categories):
        subset = df[df["Tag_Clean"] == cat]
        n_samples = min(len(subset), 10)
        sample = subset.sample(n=n_samples, random_state=42)
        sampled_list.append(sample)
        
    df_combined = pd.concat(sampled_list)
    
    # S'il reste des places pour atteindre 100
    if len(df_combined) < 100:
        remaining_needed = 100 - len(df_combined)
        remaining_df = df[~df.index.isin(df_combined.index)]
        additional_samples = remaining_df.sample(n=remaining_needed, random_state=42)
        df_combined = pd.concat([df_combined, additional_samples])
        
    # Mélanger pour que la liste soit naturelle
    df_combined = df_combined.sample(frac=1.0, random_state=42).reset_index(drop=True)
    
    # Préparer le format JSON attendu par Next.js (content + tag null)
    seed_records = []
    for _, row in df_combined.iterrows():
        seed_records.append({
            "content": str(row["Consumer Claim"]).strip(),
            "tag": None,
            "_expected_tag": str(row["Tag_Clean"]) # métadonnée indicative
        })
        
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(seed_records, f, indent=2, ensure_ascii=False)
        
    print("=" * 60)
    print(f"✅ {len(seed_records)} réclamations diversifiées générées dans : {output_json}")
    print("Distribution des réclamations générées :")
    print(df_combined["Tag_Clean"].value_counts())
    print("=" * 60)

if __name__ == "__main__":
    generate_100_seed_data()
