import sqlite3

def upgrade_database():
    conn = sqlite3.connect('operations.db')
    cursor = conn.cursor()

    try:
        cursor.execute("ALTER TABLE warehouses ADD COLUMN type VARCHAR NOT NULL DEFAULT 'internal'")
        conn.commit()
        print("Done")
    except sqlite3.OperationalError as e:
        print(f"Можливо, колонка вже була додана раніше")
    finally:
        conn.close()

if __name__ == "__main__":
    upgrade_database()