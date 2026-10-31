"""The package carries a compiled core (gos/_native), so the wheel must be marked as platform-specific."""
from setuptools import setup
from setuptools.dist import Distribution


class BinaryDistribution(Distribution):
    def has_ext_modules(self):
        return True


setup(distclass=BinaryDistribution)
