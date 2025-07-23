#!/usr/bin/env Rscript

# Install and load worldfootballR if not already installed
if (!require(worldfootballR, quietly = TRUE)) {
  if (!require(devtools, quietly = TRUE)) {
    install.packages("devtools")
  }
  devtools::install_github("JaseZiv/worldfootballR")
}

library(worldfootballR)
library(jsonlite)
library(dplyr)

# Function to fetch Eredivisie data using worldfootballR
fetch_eredivisie_data <- function(season = "2023-2024") {
  cat("🔍 Fetching Eredivisie data for season:", season, "\n")
  
  tryCatch({
    # Get league table with advanced stats (includes xG data)
    league_table <- fb_league_stats(
      country = "NED",
      gender = "M", 
      season_end_year = as.numeric(substr(season, 6, 9)),
      tier = "1st"
    )
    
    cat("✅ Successfully fetched league table with", nrow(league_table), "teams\n")
    
    # Check if xG data is available
    xg_columns <- grep("xg", names(league_table), ignore.case = TRUE, value = TRUE)
    cat("📊 xG columns found:", paste(xg_columns, collapse = ", "), "\n")
    
    return(league_table)
    
  }, error = function(e) {
    cat("❌ Error fetching data:", e$message, "\n")
    return(NULL)
  })
}

# Function to process the data into our required format
process_eredivisie_data <- function(league_data, season) {
  cat("🔄 Processing data...\n")
  
  # Define promoted teams for 2024-2025 season
  promoted_teams_2024 <- c(
    "Almere City",
    "Heracles Almelo", 
    "Roda JC Kerkrade",
    "Willem II"
  )
  
  # Create our data structure
  processed_teams <- list()
  
  for (i in 1:nrow(league_data)) {
    team_row <- league_data[i, ]
    team_name <- team_row$Squad
    
    # Check if this is a promoted team
    is_promoted <- any(sapply(promoted_teams_2024, function(x) {
      grepl(x, team_name, ignore.case = TRUE)
    }))
    
    # Extract xG data
    xg_for <- if ("xG" %in% names(team_row)) team_row$xG else 0
    xg_against <- if ("xGA" %in% names(team_row)) team_row$xGA else 0
    goals_for <- if ("GF" %in% names(team_row)) team_row$GF else 0
    goals_against <- if ("GA" %in% names(team_row)) team_row$GA else 0
    matches_played <- if ("MP" %in% names(team_row)) team_row$MP else 0
    
    # Calculate per-game averages
    xg_for_per_game <- if (matches_played > 0) xg_for / matches_played else 0
    xg_against_per_game <- if (matches_played > 0) xg_against / matches_played else 0
    goals_for_per_game <- if (matches_played > 0) goals_for / matches_played else 0
    goals_against_per_game <- if (matches_played > 0) goals_against / matches_played else 0
    
    # Create team data
    team_data <- list(
      id = as.character(i), # Generate a simple ID
      name = team_name,
      shortName = paste(substr(strsplit(team_name, " ")[[1]], 1, 1), collapse = ""),
      xGFor = round(xg_for_per_game, 3),
      xGConceded = round(xg_against_per_game, 3),
      goalsFor = round(goals_for_per_game, 3),
      goalsConceded = round(goals_against_per_game, 3),
      cleanSheets = 0, # Not available in this data
      failedToScore = 0, # Not available in this data
      homeAdvantage = 0.15,
      awayDisadvantage = -0.10,
      promoted = is_promoted,
      rank = if ("Rk" %in% names(team_row)) team_row$Rk else i,
      matchesPlayed = matches_played,
      wins = if ("W" %in% names(team_row)) team_row$W else 0,
      draws = if ("D" %in% names(team_row)) team_row$D else 0,
      losses = if ("L" %in% names(team_row)) team_row$L else 0,
      points = if ("Pts" %in% names(team_row)) team_row$Pts else 0,
      totalXG = round(xg_for, 3),
      totalXGA = round(xg_against, 3)
    )
    
    # For promoted teams, set placeholder values
    if (is_promoted) {
      team_data$xGFor <- 0
      team_data$xGConceded <- 2.0
      team_data$goalsFor <- 0
      team_data$goalsConceded <- 0
    }
    
    processed_teams[[team_name]] <- team_data
  }
  
  cat("✅ Processed", length(processed_teams), "teams\n")
  return(processed_teams)
}

# Function to save data as JSON
save_eredivisie_data <- function(processed_teams, season) {
  # Calculate metadata
  non_promoted_teams <- Filter(function(team) !team$promoted, processed_teams)
  
  avg_xg_for <- if (length(non_promoted_teams) > 0) {
    mean(sapply(non_promoted_teams, function(team) team$xGFor))
  } else 0
  
  avg_xg_conceded <- if (length(non_promoted_teams) > 0) {
    mean(sapply(non_promoted_teams, function(team) team$xGConceded))
  } else 0
  
  # Create output data structure
  output_data <- list(
    season = season,
    lastUpdated = format(Sys.time(), "%Y-%m-%dT%H:%M:%S.000Z"),
    dataSource = "FBref via worldfootballR",
    teams = processed_teams,
    metadata = list(
      totalTeams = length(processed_teams),
      promotedTeams = length(Filter(function(team) team$promoted, processed_teams)),
      relegatedTeams = 0,
      averageXGFor = round(avg_xg_for, 3),
      averageXGConceded = round(avg_xg_conceded, 3),
      notes = c(
        "Data sourced from FBref via worldfootballR R package",
        "xG and xGC values are per game averages calculated from total season values",
        "Promoted teams have xG=0 and xGC=2 as placeholder values",
        "Home/away advantages are estimated based on historical data",
        "Clean sheets and failed to score stats not available in this data source"
      )
    )
  )
  
  # Save to file
  output_path <- file.path("data", "internal", "team-stats-2024-25-worldfootballr.json")
  write_json(output_data, output_path, pretty = TRUE, auto_unbox = TRUE)
  
  cat("💾 Data saved to:", output_path, "\n")
  return(output_path)
}

# Main execution
main <- function() {
  cat("🚀 Starting Eredivisie data fetch with worldfootballR...\n\n")
  
  # Try 2024-2025 first, fallback to 2023-2024
  seasons_to_try <- c("2024-2025", "2023-2024")
  
  for (season in seasons_to_try) {
    cat("📅 Trying season:", season, "\n")
    
    league_data <- fetch_eredivisie_data(season)
    
    if (!is.null(league_data) && nrow(league_data) > 0) {
      cat("✅ Successfully fetched data for", season, "\n")
      
      # Check if we have meaningful xG data
      xg_columns <- grep("xg", names(league_data), ignore.case = TRUE, value = TRUE)
      has_xg_data <- any(sapply(xg_columns, function(col) {
        any(!is.na(league_data[[col]]) & league_data[[col]] > 0)
      }))
      
      if (has_xg_data) {
        cat("📊 Found meaningful xG data\n")
        processed_teams <- process_eredivisie_data(league_data, season)
        output_path <- save_eredivisie_data(processed_teams, season)
        
        # Display summary
        cat("\n📋 Summary:\n")
        cat("- Total teams:", length(processed_teams), "\n")
        cat("- Promoted teams:", length(Filter(function(team) team$promoted, processed_teams)), "\n")
        cat("- Average xG For:", round(mean(sapply(processed_teams, function(team) team$xGFor)), 3), "\n")
        cat("- Average xG Conceded:", round(mean(sapply(processed_teams, function(team) team$xGConceded)), 3), "\n")
        
        # Show top 3 teams by xG For (excluding promoted)
        non_promoted <- Filter(function(team) !team$promoted, processed_teams)
        if (length(non_promoted) > 0) {
          top_scoring <- head(sort(non_promoted, function(a, b) b$xGFor - a$xGFor), 3)
          cat("\n🏆 Top 3 teams by xG For (excluding promoted):\n")
          for (i in seq_along(top_scoring)) {
            team <- top_scoring[[i]]
            cat(i, ".", team$name, ":", team$xGFor, "xG (Rank:", team$rank, ")\n")
          }
        }
        
        break
      } else {
        cat("⚠️ No meaningful xG data found for", season, "\n")
      }
    } else {
      cat("❌ Failed to fetch data for", season, "\n")
    }
    
    if (season != tail(seasons_to_try, 1)) {
      cat("🔄 Trying next season...\n\n")
    }
  }
  
  cat("\n🎉 Data fetch completed!\n")
}

# Run the script
if (!interactive()) {
  main()
} 