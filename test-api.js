const SQL_QUERY = `
SELECT
  l.cartodb_id,
  l.business_name AS tradename,
  l.legalname,
  l.address,
  ST_Y(l.the_geom) AS lat,
  ST_X(l.the_geom) AS lng,
  COUNT(v.objectid) AS open_violation_count
FROM business_licenses l
LEFT JOIN li_violations v
  ON UPPER(l.address) = UPPER(v.address)
  AND v.casestatus = 'OPEN'
WHERE l.licensestatus = 'Active'
  AND (l.licensetype LIKE '%Food%' OR l.licensetype LIKE '%Restaurant%')
  AND l.the_geom IS NOT NULL
GROUP BY l.cartodb_id, l.business_name, l.legalname, l.address, l.the_geom
LIMIT 10
`.trim();

fetch('https://phl.carto.com/api/v2/sql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ q: SQL_QUERY })
})
  .then(res => res.text())
  .then(text => console.log(text))
  .catch(err => console.error(err))
