package core

import (
	"fmt"
	"strings"

	"github.com/fatih/color"
)

const (
	VERSION = "∞"
)

func putAsciiArt(s string) {
	for _, c := range s {
		d := string(c)
		switch string(c) {
		case "#":
			color.Set(color.BgRed)
			d = " "
		case "@":
			color.Set(color.BgBlack)
			d = " "
		case "$":
			color.Set(color.BgWhite)
			d = " "
		}
		fmt.Print(d)
	}
	color.Unset()
}

func printLogo(s string) {
	for _, c := range s {
		d := string(c)
		switch string(c) {
		case "_":
			color.Set(color.FgWhite)
		case "\n":
			color.Unset()
		default:
			color.Set(color.FgHiBlack)
		}
		fmt.Print(d)
	}
	color.Unset()
}

func printUpdateName() {
	nameClr := color.New(color.FgRed)
	txt := nameClr.Sprintf("-------------------------  NO RED  --------------------------")
	fmt.Fprintf(color.Output, "%s", txt)
}

func printOneliner1() {
	handleClr := color.New(color.FgHiBlue)
	versionClr := color.New(color.FgGreen)
	textClr := color.New(color.FgHiBlack)
	spc := strings.Repeat(" ", 10-len(VERSION))
	txt := textClr.Sprintf(" BY LUCIFER >Telegram> (") +
		handleClr.Sprintf("EVILGINX_L08") +
		textClr.Sprintf(")") +
		textClr.Sprintf(", Modified by (") +
		handleClr.Sprintf("@Evilginx_L08") +
		textClr.Sprintf(")") +
		spc +
		versionClr.Sprintf("%s", VERSION)
	fmt.Fprintf(color.Output, "%s", txt)
}

func printOneliner2() {
	textClr := color.New(color.FgHiBlack)
	red := color.New(color.FgRed)
	white := color.New(color.FgWhite)
	txt := red.Sprintf("           TRANSCEND BOUNDARIES BOLDLY") +
		white.Sprintf(" - ") +
		textClr.Sprintf("BETTER VERSION")
	fmt.Fprintf(color.Output, "%s", txt)
}

func printSeparator() {
	white := color.New(color.FgRed)
	txt := white.Sprintf("-------------------------------------------------------------")
	fmt.Println(txt)
}

func Banner() {
	fmt.Println()

	putAsciiArt("                    #####################                    ")
	fmt.Println()
	putAsciiArt("               ###############################               ")
	fmt.Println()
	putAsciiArt("           #########@@@@@@#########@@@@@@#########           ")
	fmt.Println()
	putAsciiArt("        ########@@@@@@@@@@#########@@@@@@@@@@#######         ")
	fmt.Println()
	putAsciiArt("      #######@@@@@@@@@@@@@#########@@@@@@@@@@@@@######       ")
	fmt.Println()
	putAsciiArt("     ######@@@@@@@@@@@@@@@#########@@@@@@@@@@@@@@@######     ")
	fmt.Println()
	putAsciiArt("   ######@@@@@@@@@@@@@@@@@#########@@@@@@@@@@@@@@@@@#####    ")
	fmt.Println()
	putAsciiArt("  ######@@@@@@@@@@@@@@@@@@#########@@@@@@@@@@@@@@@@@@######  ")
	fmt.Println()
	putAsciiArt(" ######@@@@@@@@@@@@@@@@@@@#########@@@@@@@@@@@@@@@@@@@#####  ")
	fmt.Println()
	putAsciiArt(" #####@@@@@@@@@@@@@@@@@@@@#########@@@@@@@@@@@@@@@@@@@@##### ")
	fmt.Println()
	putAsciiArt("######@@@@@$$@@@@@@@@@@@@@#########@@@@@@@@@@@@$$$@@@@@##### ")
	fmt.Println()
	putAsciiArt("######@@@@@$$$$$$@@@@@@@@@#########@@@@@@@@$$$$$$@@@@@@##### ")
	fmt.Println()
	putAsciiArt("######@@@@@@@$$$$$$$$@@@@@#########@@@@$$$$$$$$$@@@@@@@##### ")
	fmt.Println()
	putAsciiArt(" #####@@@@@@@@$$$$$$$$@@@@#########@@@@$$$$$$$@@@@@@@@@##### ")
	fmt.Println()
	putAsciiArt(" ######@@@@@@@@@@@@@@@@@@@#########@@@@@@@@@@@@@@@@@@@###### ")
	fmt.Println()
	putAsciiArt("  #####@@@@@@@@@@@@@@@@@@@#########@@@@@@@@@@@@@@@@@@######  ")
	fmt.Println()
	putAsciiArt("   ######@@@@@@@@@@@@@@@@@#########@@@@@@@@@@@@@@@@@######   ")
	fmt.Println()
	putAsciiArt("    ######@@@@@@@@@@@@@@@@#########@@@@@@@@@@@@@@@@######    ")
	fmt.Println()
	putAsciiArt("     #######@@@@@@@@@@@@@@#########@@@@@@@@@@@@@@######      ")
	fmt.Println()
	putAsciiArt("       #######@@@@@@@@@@@@#########@@@@@@@@@@@#######        ")
	fmt.Println()
	putAsciiArt("          ########@@@@@@@@#########@@@@@@@@########          ")
	fmt.Println()
	putAsciiArt("             ##########@@@#########@@@##########             ")
	fmt.Println()
	putAsciiArt("                 ###########################                 ")
	fmt.Println()
	putAsciiArt("                     ###################                     ")
	fmt.Println()
	printUpdateName()
	fmt.Println()
	printLogo(`  _____         _          _                  _     ___   ___  `)
	fmt.Println()
	printLogo(` | ____|_    _ (_) __  _ _(_) __ __   __     | |   / _ \ ( _ ) `)
	fmt.Println()
	printLogo(` |  _|  \ \ / /| || |/ _' | | '_ \\ \/ /     | |  | | | |/ _ \ `)
	fmt.Println()
	printLogo(` | |___  \ V / | || | (_| | | | | |>  <      | |__| |_| | (_) |`)
	fmt.Println()
	printLogo(` |_____|  \_/  |_||_|\__, |_|_| |_/_/\_\     |_____\___/ \___/ `)
	fmt.Println()
	printLogo(`                     |___/                                     `)
	fmt.Println()
	printUpdateName()
	fmt.Println()
	printOneliner1()
	fmt.Println()
	printOneliner2()
	fmt.Println()
	fmt.Println()
	printSeparator()
	fmt.Println()
}
