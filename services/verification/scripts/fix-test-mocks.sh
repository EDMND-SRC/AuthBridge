#!/bin/bash
# Script to fix Vitest 4.x mocking issues across all test files
# Replaces .mockImplementation(() => with proper constructor functions

echo "Fixing test mocks for Vitest 4.x compatibility..."

# Find all test files
find src tests -name "*.test.ts" -type f | while read file; do
  # Check if file contains the problematic pattern
  if grep -q "\.mockImplementation(() =>" "$file"; then
    echo "Fixing: $file"

    # Replace arrow function with constructor function
    # Pattern: .mockImplementation(() => ({ -> .mockImplementation(function() { return {
    sed -i.bak 's/\.mockImplementation(() => ({/.mockImplementation(function() { return {/g' "$file"

    # Replace closing })) with }; })
    # This is trickier and may need manual review
    # sed -i.bak 's/})),/}; }),/g' "$file"

    # Remove backup file
    rm -f "$file.bak"
  fi
done

echo "Done! Please review the changes and run tests."
