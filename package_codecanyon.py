import subprocess
import sys

def main():
    result = subprocess.run(["node", "package-codecanyon.cjs"], check=True)
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()
