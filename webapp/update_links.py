import os

path = 'webapp/app.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    ("onclick=\"window.location.href='/profile.html'\">Get Started Free</button>", "onclick=\"window.location.href='/signup.html?tier=free'\">Get Started Free</button>"),
    ("onclick=\"window.location.href='/profile.html'\">Become a Designer</button>", "onclick=\"window.location.href='/signup.html?tier=designer'\">Become a Designer</button>"),
    ("onclick=\"window.location.href='/profile.html'\">Join as Entrepreneur</button>", "onclick=\"window.location.href='/signup.html?tier=entrepreneur'\">Join as Entrepreneur</button>"),
    ("onclick=\"window.location.href='/profile.html'\">Upgrade to Pro</button>", "onclick=\"window.location.href='/signup.html?tier=professional'\">Upgrade to Pro</button>"),
    ("onclick=\"window.location.href='/profile.html'\">Contact Sales</button>", "onclick=\"window.location.href='/signup.html?tier=enterprise'\">Contact Sales</button>")
]

for src, dst in replacements:
    content = content.replace(src, dst)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated buttons!')
