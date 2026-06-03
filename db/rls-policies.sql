-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- organizations: users see orgs they belong to
CREATE POLICY "users_see_own_org" ON organizations FOR SELECT
  USING (id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "org_admin_manage" ON organizations FOR ALL
  USING (id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'admin'));

-- org_members: visible to org members, managed by org admin
CREATE POLICY "org_members_select" ON org_members FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "org_admin_manage_members" ON org_members FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'admin'));

-- vehicles: accessible via vehicle_access OR org admin
CREATE POLICY "vehicle_access_select" ON vehicles FOR SELECT
  USING (
    id IN (SELECT vehicle_id FROM vehicle_access WHERE user_id = auth.uid())
    OR org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "vehicle_admin_manage" ON vehicles FOR ALL
  USING (
    id IN (SELECT vehicle_id FROM vehicle_access WHERE user_id = auth.uid() AND role = 'admin')
    OR org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'admin')
  );

-- vehicle_access: see your own + admin sees all in org
CREATE POLICY "vehicle_access_self" ON vehicle_access FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "vehicle_access_admin" ON vehicle_access FOR ALL
  USING (
    vehicle_id IN (SELECT vehicle_id FROM vehicle_access WHERE user_id = auth.uid() AND role = 'admin')
  );

-- documents: same access as vehicle
CREATE POLICY "documents_select" ON documents FOR SELECT
  USING (
    vehicle_id IN (SELECT vehicle_id FROM vehicle_access WHERE user_id = auth.uid())
    OR vehicle_id IN (SELECT id FROM vehicles WHERE org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'admin'
    ))
  );

CREATE POLICY "documents_editor_manage" ON documents FOR ALL
  USING (
    vehicle_id IN (SELECT vehicle_id FROM vehicle_access WHERE user_id = auth.uid() AND role IN ('admin','editor'))
  );

-- Helper subquery: documents accessible to the current user (via vehicle_access or org admin)
-- Used by document_files and detail table policies.

-- document_files: inherit access from document → vehicle chain
CREATE POLICY "doc_files_select" ON document_files FOR SELECT
  USING (
    document_id IN (
      SELECT d.id FROM documents d
      WHERE d.vehicle_id IN (
        SELECT vehicle_id FROM vehicle_access WHERE user_id = auth.uid()
      )
      OR d.vehicle_id IN (
        SELECT v.id FROM vehicles v
        WHERE v.org_id IN (
          SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

CREATE POLICY "doc_files_editor_manage" ON document_files FOR ALL
  USING (
    document_id IN (
      SELECT d.id FROM documents d
      WHERE d.vehicle_id IN (
        SELECT vehicle_id FROM vehicle_access WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
      )
    )
  );

-- insurance_details
CREATE POLICY "insurance_details_select" ON insurance_details FOR SELECT
  USING (
    document_id IN (
      SELECT d.id FROM documents d
      WHERE d.vehicle_id IN (
        SELECT vehicle_id FROM vehicle_access WHERE user_id = auth.uid()
      )
      OR d.vehicle_id IN (
        SELECT v.id FROM vehicles v
        WHERE v.org_id IN (
          SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

CREATE POLICY "insurance_details_editor_manage" ON insurance_details FOR ALL
  USING (
    document_id IN (
      SELECT d.id FROM documents d
      WHERE d.vehicle_id IN (
        SELECT vehicle_id FROM vehicle_access WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
      )
    )
  );

-- revision_details
CREATE POLICY "revision_details_select" ON revision_details FOR SELECT
  USING (
    document_id IN (
      SELECT d.id FROM documents d
      WHERE d.vehicle_id IN (
        SELECT vehicle_id FROM vehicle_access WHERE user_id = auth.uid()
      )
      OR d.vehicle_id IN (
        SELECT v.id FROM vehicles v
        WHERE v.org_id IN (
          SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

CREATE POLICY "revision_details_editor_manage" ON revision_details FOR ALL
  USING (
    document_id IN (
      SELECT d.id FROM documents d
      WHERE d.vehicle_id IN (
        SELECT vehicle_id FROM vehicle_access WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
      )
    )
  );

-- maintenance_details
CREATE POLICY "maintenance_details_select" ON maintenance_details FOR SELECT
  USING (
    document_id IN (
      SELECT d.id FROM documents d
      WHERE d.vehicle_id IN (
        SELECT vehicle_id FROM vehicle_access WHERE user_id = auth.uid()
      )
      OR d.vehicle_id IN (
        SELECT v.id FROM vehicles v
        WHERE v.org_id IN (
          SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

CREATE POLICY "maintenance_details_editor_manage" ON maintenance_details FOR ALL
  USING (
    document_id IN (
      SELECT d.id FROM documents d
      WHERE d.vehicle_id IN (
        SELECT vehicle_id FROM vehicle_access WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
      )
    )
  );

-- notifications: own only
CREATE POLICY "notifications_own" ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notification_prefs_own" ON notification_prefs FOR ALL
  USING (user_id = auth.uid());
