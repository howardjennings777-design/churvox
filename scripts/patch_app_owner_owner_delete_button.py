from pathlib import Path

path = Path('frontend/src/pages/AppOwnerPage.js')
text = path.read_text(encoding='utf-8')

if 'function isProtectedPlatformAccount' not in text:
    anchor = '''function isOwnerAccount(item) {
  const role = roleOf(item);
  if (OWNER_ROLES.has(role)) return true;
  if (item?.is_platform_owner === true) return true;
  return false;
}
'''
    insert = anchor + '''
function isProtectedPlatformAccount(item) {
  const email = String(item?.email || "").trim().toLowerCase();
  const role = roleOf(item);
  return email === "hello@churvox.com" || role === "platform_owner" || item?.is_platform_owner === true;
}
'''
    text = text.replace(anchor, insert)

text = text.replace(
    'const canDelete = selected === "users" && !isOwnerAccount(item);',
    'const canDelete = (selected === "users" || selected === "owners") && !isProtectedPlatformAccount(item);'
)

text = text.replace(
    'if (isOwnerAccount(item)) {\n      setWarning("Owner and platform owner accounts are protected. Delete workers/team users only.");\n      return;\n    }',
    'if (isProtectedPlatformAccount(item)) {\n      setWarning("The protected platform owner account cannot be removed here.");\n      return;\n    }'
)

text = text.replace(
    'Delete user ${label}? This removes the team user account and cannot be undone from the dashboard.',
    'Remove account ${label}? This removes login access and archives the account. Business records are kept.'
)

text = text.replace('setWarning(`Deleted user: ${label}`);', 'setWarning(`Removed account: ${label}`);')
text = text.replace('setWarning(err.message || "Could not delete user.");', 'setWarning(err.message || "Could not remove account.");')

path.write_text(text, encoding='utf-8')
print('Updated app owner UI to allow removing owner and user accounts except protected platform owner')
