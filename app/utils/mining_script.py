#!/usr/bin/env python3
"""
PrefixSpan pattern mining script
Requires: pip install prefixspan

Usage: python3 prefixspan.py <sequences_json> <top_k> <min_support>
"""

import sys
import json

def mine_patterns(sequences, top_k=10, min_support=0.1):
    """
    Mine frequent sequential patterns using PrefixSpan

    Args:
        sequences: List of sequences, where each sequence is a list of items
        top_k: Number of top patterns to return
        min_support: Minimum support threshold (0-1)

    Returns:
        List of patterns with their support counts
    """
    try:
        from prefixspan import PrefixSpan
    except ImportError:
        # Fallback: return empty if prefixspan not installed
        print(f"Error: prefixspan not installed", file=sys.stderr)
        print(json.dumps([]), file=sys.stdout)
        return

    # Calculate minimum support count (ensure it's at least 1)
    min_support_count = max(1, int(len(sequences) * min_support))
    
    # print(f"Mining patterns for {len(sequences)} sequences with min_support_count={min_support_count}", file=sys.stderr)

    # Run PrefixSpan
    ps = PrefixSpan(sequences)
    patterns = ps.frequent(minsup=min_support_count)

    # Sort by support (descending) and take top K
    patterns.sort(key=lambda x: x[0], reverse=True)
    patterns = patterns[:top_k]

    # Format output
    result = []
    for support, pattern in patterns:
        result.append({
            "pattern": pattern,
            "support": support
        })

    # Output as JSON
    print(json.dumps(result), file=sys.stdout)

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python3 prefixspan.py <sequences_json_or_dash> <top_k> <min_support>", file=sys.stderr)
        sys.exit(1)

    try:
        data_arg = sys.argv[1]
        top_k = int(sys.argv[2])
        min_support = float(sys.argv[3])

        if data_arg == "-":
            sequences_json = sys.stdin.read()
        else:
            sequences_json = data_arg

        sequences = json.loads(sequences_json)
        mine_patterns(sequences, top_k, min_support)

    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)
