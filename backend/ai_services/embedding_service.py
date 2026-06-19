from sentence_transformers import SentenceTransformer

model = SentenceTransformer(
    "BAAI/bge-base-en-v1.5"
)




def generate_embedding(text):

    embedding = model.encode(
        text
    )

    return embedding.tolist()