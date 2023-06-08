# re-ports
Recursively finds docker-compose 'ports' declarations and prints to stdout as CSV.

## usage
Using a terminal emulator, navigate to a root directory and type `npx @benforshey/re-ports`. This will print to your terminal a CSV output of all `ports` declarations found in Docker Compose YAML files. It searches recursively, which means that it would find all Docker Compose YAML files in a directory structure like this:
```sh
.
|-docker-compose.yml
|-directory-one
  |-docker-compose.override.yml
  |-directory-two
    |-docker-compose.production.yml
```
 
Printing to stdout isn't terribly useful on its own, so you can redirect the output to a file by running a command like this: `npx @benforshey/re-ports > reports.csv`. You could then open your reports.csv file and read your report in a spreadsheet format. If you want to see the output _and_ write the output to a file, you could use a program like `tee`: `npx @benforshey/re-ports | tee reports.csv`.
