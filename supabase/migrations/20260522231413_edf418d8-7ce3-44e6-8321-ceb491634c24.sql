
REVOKE EXECUTE ON FUNCTION public.import_list_to_invitation(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.import_list_to_invitation(uuid, uuid) TO authenticated;
