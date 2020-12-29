#!/bin/bash

pdflatex -halt-on-error presentation.tex

pdflatex -halt-on-error report.tex
biber report.bcf
pdflatex -halt-on-error report.tex
pdflatex -halt-on-error report.tex
