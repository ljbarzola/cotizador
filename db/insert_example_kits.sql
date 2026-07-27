-- ============================================================
-- KITS DE EJEMPLO
-- Ejecutar después de sincronizar el catálogo desde Google Sheets.
-- Los catalogIdx se basan en el orden de carga del CATALOG:
--   0..N_E-1 = equipos, N_E..N_E+N_M-1 = materiales, N_E+N_M.. = servicios
-- Verifica el total con:
--   SELECT count(*) FROM equipos;  -- N_E
--   SELECT count(*) FROM materiales; -- N_M
-- ============================================================
-- NOTA: Los índices (catalogIdx) son referenciales y pueden
-- cambiar si se sincroniza el catálogo. Si no se agregan
-- productos nuevos, los índices se mantienen estables.
-- ============================================================

-- Primero limpiar kits existentes de ejemplo (opcional)
-- DELETE FROM kits WHERE name LIKE 'Kit %';

-- Kit 1: Cámaras IP + Cable + DVR (4-6 componentes)
INSERT INTO kits (name, components) VALUES
('Kit Cámaras IP Básico', '[
  {"catalogIdx": 0, "included": true},
  {"catalogIdx": 1, "included": true},
  {"catalogIdx": 5, "included": true},
  {"catalogIdx": 10, "included": true},
  {"catalogIdx": 15, "included": true},
  {"catalogIdx": 20, "included": true}
]');

-- Kit 2: Alarma + Sensores + Panel (3-5 componentes)
INSERT INTO kits (name, components) VALUES
('Kit Alarma Residencial', '[
  {"catalogIdx": 2, "included": true},
  {"catalogIdx": 7, "included": true},
  {"catalogIdx": 12, "included": true},
  {"catalogIdx": 18, "included": true}
]');

-- Kit 3: Control de Acceso + Lector + Cerradura (3-4 componentes)
INSERT INTO kits (name, components) VALUES
('Kit Control de Acceso', '[
  {"catalogIdx": 3, "included": true},
  {"catalogIdx": 8, "included": true},
  {"catalogIdx": 13, "included": true},
  {"catalogIdx": 19, "included": true},
  {"catalogIdx": 22, "included": true}
]');

-- Kit 4: Cableado + Conectores + Patch (4-6 componentes)
INSERT INTO kits (name, components) VALUES
('Kit Cableado Estructurado', '[
  {"catalogIdx": 4, "included": true},
  {"catalogIdx": 9, "included": true},
  {"catalogIdx": 14, "included": true},
  {"catalogIdx": 16, "included": true},
  {"catalogIdx": 21, "included": true},
  {"catalogIdx": 25, "included": true}
]');

-- Kit 5: Grabación DVR/NVR + Disco + Monitor (3-5 componentes)
INSERT INTO kits (name, components) VALUES
('Kit Grabación y Monitoreo', '[
  {"catalogIdx": 6, "included": true},
  {"catalogIdx": 11, "included": true},
  {"catalogIdx": 17, "included": true},
  {"catalogIdx": 23, "included": true}
]');

-- Verificar
SELECT id, name, jsonb_array_length(components) AS num_components FROM kits;
