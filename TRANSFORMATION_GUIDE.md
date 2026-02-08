# Data Transformation Guide

The pipeline now supports real data transformations! Configure transform steps using the `config` object with these operations:

## 1. Column Mapping/Renaming
Rename columns in your data.

```json
{
  "columnMapping": {
    "old_name": "new_name",
    "price": "cost",
    "hp": "horsepower"
  }
}
```

## 2. Filter Rows
Filter data based on conditions.

```json
{
  "filter": {
    "price": { "greaterThan": 10000, "lessThan": 50000 },
    "fuel": { "equals": "Diesel" },
    "make": { "contains": "BMW" },
    "model": { "notNull": true }
  }
}
```

Supported filter operations:
- `equals`: Exact match
- `notEquals`: Not equal to
- `greaterThan`: Numeric greater than
- `lessThan`: Numeric less than
- `contains`: String contains substring
- `notNull`: Value is not null/empty

## 3. Add Calculated Columns
Create new columns with expressions.

```json
{
  "addColumns": [
    {
      "name": "price_per_hp",
      "expression": "{price} / {hp}",
      "type": "number"
    },
    {
      "name": "full_name",
      "expression": "{make} {model}",
      "type": "string"
    }
  ]
}
```

Reference existing columns using `{columnName}` syntax.

## 4. Select Specific Columns
Keep only specific columns.

```json
{
  "selectColumns": ["make", "model", "price", "year"]
}
```

## 5. Data Type Conversions
Convert column data types.

```json
{
  "convertTypes": {
    "price": "number",
    "year": "number",
    "make": "uppercase",
    "model": "lowercase"
  }
}
```

Supported types:
- `number`: Convert to numeric
- `string`: Convert to string
- `boolean`: Convert to boolean
- `uppercase`: Convert string to uppercase
- `lowercase`: Convert string to lowercase

## 6. Aggregation (Group By)
Group data and calculate aggregates.

```json
{
  "groupBy": ["make", "fuel"],
  "aggregations": [
    {
      "column": "price",
      "operation": "avg",
      "alias": "avg_price"
    },
    {
      "column": "hp",
      "operation": "max",
      "alias": "max_horsepower"
    },
    {
      "column": "model",
      "operation": "count",
      "alias": "model_count"
    }
  ]
}
```

Supported operations:
- `sum`: Sum of values
- `avg`: Average of values
- `count`: Count of records
- `min`: Minimum value
- `max`: Maximum value

## Example: Complete Transform Step

```json
{
  "id": "transform-1",
  "type": "transform",
  "name": "Clean and Enrich Car Data",
  "description": "Filter, calculate, and aggregate car data",
  "config": {
    "filter": {
      "price": { "greaterThan": 5000 },
      "hp": { "notNull": true }
    },
    "addColumns": [
      {
        "name": "price_per_hp",
        "expression": "{price} / {hp}",
        "type": "number"
      }
    ],
    "convertTypes": {
      "make": "uppercase",
      "year": "number"
    },
    "selectColumns": ["make", "model", "year", "price", "hp", "price_per_hp"]
  }
}
```

## Chaining Transformations

Operations are applied in this order:
1. Column Mapping
2. Filter Rows
3. Add Calculated Columns
4. Select Columns
5. Convert Types
6. Aggregation

You can combine multiple operations in one transform step, or create multiple transform steps for complex pipelines.
